import json
from decimal import Decimal

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Sum

from .models import Notification, Lot, Personne, ResidenceMembership, DetailAppelCharge, Paiement
from .views import get_user_residence


def _compute_lot_solde(lot):
    """
    Calcule le solde restant dû pour un lot.
    Formule identique à views_rapport._rapport_data :
      total_du   = Sum(DetailAppelCharge.montant)
      total_paye = Sum(Paiement.montant)
    Les deux requêtes sont séparées pour éviter la multiplication par cross-join.
    """
    total_du = (
        DetailAppelCharge.objects.filter(lot=lot).aggregate(s=Sum("montant"))["s"]
        or Decimal("0")
    )
    total_paye = (
        Paiement.objects.filter(lot=lot).aggregate(s=Sum("montant"))["s"]
        or Decimal("0")
    )
    return max(total_du - total_paye, Decimal("0"))


def _json(data, status=200):
    return JsonResponse(data, status=status, safe=isinstance(data, dict))


def _require_manager(request):
    """Return (residence, None) or (None, error_response)."""
    if not request.user.is_authenticated:
        return None, _json({"detail": "Non authentifié."}, status=401)
    residence = get_user_residence(request)
    if not residence:
        return None, _json({"detail": "Aucune résidence associée."}, status=403)
    return residence, None


@require_http_methods(["POST"])
def create_notification(request):
    """
    Manager endpoint — create a notification (usually SMS) for a lot.
    Body JSON:
      { lot_id, type_notification, titre, message, montant_du }
    """
    residence, err = _require_manager(request)
    if err:
        return err

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return _json({"detail": "JSON invalide."}, status=400)

    lot_id = body.get("lot_id")
    if not lot_id:
        return _json({"detail": "lot_id requis."}, status=400)

    try:
        lot = Lot.objects.get(pk=lot_id, groupe__residence=residence)
    except Lot.DoesNotExist:
        return _json({"detail": "Lot introuvable."}, status=404)

    # Resolve personne (propriétaire du lot)
    personne = lot.proprietaire if hasattr(lot, "proprietaire") else None

    type_notif = body.get("type_notification", "SMS")
    titre      = body.get("titre", "Rappel de paiement")

    # Always recompute the balance from the database — never trust the frontend value
    montant_du = _compute_lot_solde(lot)

    # Auto-generate message if not provided
    message = body.get("message") or ""
    if not message.strip():
        lot_label   = f"Lot {lot.numero_lot}"
        montant_str = f"{montant_du:.2f} MAD" if montant_du > 0 else "un montant dû"
        message = (
            f"Cher(e) propriétaire du {lot_label}, "
            f"nous vous informons qu'un solde de {montant_str} est en attente de règlement. "
            f"Merci de régulariser votre situation dans les meilleurs délais. — Syndic"
        )

    notif = Notification.objects.create(
        residence=residence,
        lot=lot,
        personne=personne,
        type_notification=type_notif,
        titre=titre,
        message=message,
        montant_du=montant_du if montant_du > 0 else None,
        statut="ENVOYE",
    )

    return _json({
        "id":               notif.id,
        "lot_id":           lot.id,
        "lot_numero":       lot.numero_lot,
        "type_notification": notif.type_notification,
        "titre":            notif.titre,
        "message":          notif.message,
        "montant_du":       str(notif.montant_du) if notif.montant_du else None,
        "statut":           notif.statut,
        "date_notification": notif.date_notification.isoformat(),
    }, status=201)


@require_http_methods(["GET"])
def resident_notifications_view(request):
    """Resident endpoint — list notifications for their lot."""
    if not request.user.is_authenticated:
        return _json({"detail": "Non authentifié."}, status=401)

    membership = ResidenceMembership.objects.filter(
        user=request.user, actif=True
    ).select_related("lot").first()

    if not membership or membership.role != "RESIDENT":
        return _json({"detail": "Accès réservé aux résidents."}, status=403)

    if not membership.lot:
        return _json({"notifications": [], "nb_non_lu": 0})

    notifications = (
        Notification.objects
        .filter(lot=membership.lot)
        .order_by("-date_notification")
    )

    data = []
    for n in notifications:
        data.append({
            "id":                n.id,
            "type_notification": n.type_notification,
            "type_label":        n.get_type_notification_display(),
            "titre":             n.titre,
            "message":           n.message,
            "montant_du":        str(n.montant_du) if n.montant_du else None,
            "statut":            n.statut,
            "date_notification": n.date_notification.isoformat(),
        })

    nb_non_lu = sum(1 for n in data if n["statut"] != "LU")
    return _json({"notifications": data, "nb_non_lu": nb_non_lu})


@require_http_methods(["POST"])
def mark_notification_read(request, pk):
    """Resident endpoint — mark a notification as read."""
    if not request.user.is_authenticated:
        return _json({"detail": "Non authentifié."}, status=401)

    membership = ResidenceMembership.objects.filter(
        user=request.user, actif=True
    ).select_related("lot").first()

    if not membership or not membership.lot:
        return _json({"detail": "Accès refusé."}, status=403)

    try:
        notif = Notification.objects.get(pk=pk, lot=membership.lot)
    except Notification.DoesNotExist:
        return _json({"detail": "Notification introuvable."}, status=404)

    notif.statut = "LU"
    notif.save(update_fields=["statut"])
    return _json({"id": notif.id, "statut": "LU"})
