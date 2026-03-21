"""
Espace Résident — Messages / Réclamations + Consultation admin.
"""
import logging
from decimal import Decimal

from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    MessageResident, ResidenceMembership, Lot,
    DetailAppelCharge, AppelCharge,
    MandatBureauSyndical, AssembleeGenerale, Resolution,
    DocumentGouvernance, CaisseMouvement, Depense, Recette,
)
from .views_users import _require_admin

logger = logging.getLogger(__name__)


# ── Helpers ────────────────────────────────────────────────────────────────

def _msg_dict(m):
    exp = m.expediteur
    return {
        "id":              m.id,
        "created_at":      str(m.created_at)[:16].replace("T", " "),
        "objet":           m.objet,
        "message":         m.message,
        "statut":          m.statut,
        "statut_label":    dict(MessageResident.STATUT_CHOICES).get(m.statut, m.statut),
        "reponse":         m.reponse,
        "lot_id":          m.lot_id,
        "lot_numero":      m.lot.numero_lot if m.lot else None,
        "expediteur":      (exp.get_full_name() or exp.username) if exp else None,
        "expediteur_username": exp.username if exp else None,
        "expediteur_email":    exp.email    if exp else None,
        "origine":         "Portail Résident",
    }


# ── Helper : staff (admin + gestionnaire) ─────────────────────────────────

def _require_staff(request):
    """Allow ADMIN, SUPER_ADMIN and GESTIONNAIRE to manage messages."""
    from .models import ResidenceMembership
    membership = ResidenceMembership.objects.filter(
        user=request.user, actif=True
    ).select_related("residence").first()
    if not membership:
        return None, Response({"detail": "Aucune résidence liée."}, status=403)
    if membership.role not in ("ADMIN", "SUPER_ADMIN", "GESTIONNAIRE"):
        return None, Response({"detail": "Accès non autorisé."}, status=403)
    return membership, None


# ── Admin : list ───────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def messages_list(request):
    admin_membership, err = _require_staff(request)
    if err:
        return err
    qs = (
        MessageResident.objects
        .filter(residence=admin_membership.residence)
        .select_related("lot", "expediteur")
    )
    if statut := request.GET.get("statut"):
        qs = qs.filter(statut=statut)
    if lot_id := request.GET.get("lot"):
        qs = qs.filter(lot_id=lot_id)
    return Response([_msg_dict(m) for m in qs])


# ── Admin : update statut + réponse ───────────────────────────────────────

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def message_update(request, pk):
    admin_membership, err = _require_staff(request)
    if err:
        return err
    try:
        msg = MessageResident.objects.select_related("lot", "expediteur").get(
            pk=pk, residence=admin_membership.residence
        )
    except MessageResident.DoesNotExist:
        return Response({"detail": "Message introuvable."}, status=404)

    if "statut" in request.data:
        msg.statut = request.data["statut"]
    if "reponse" in request.data:
        msg.reponse = request.data["reponse"]
    msg.save()
    return Response(_msg_dict(msg))


# ── Resident : submit ──────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def message_submit(request):
    """Résident envoie un message/réclamation."""
    membership = (
        ResidenceMembership.objects
        .filter(user=request.user, actif=True)
        .select_related("residence", "lot")
        .first()
    )
    if not membership:
        return Response({"detail": "Aucune résidence liée à ce compte."}, status=403)

    objet   = (request.data.get("objet") or "").strip()
    message = (request.data.get("message") or "").strip()
    if not objet or not message:
        return Response({"detail": "Objet et message sont obligatoires."}, status=400)

    msg = MessageResident.objects.create(
        residence=membership.residence,
        lot=membership.lot,
        expediteur=request.user,
        objet=objet,
        message=message,
    )
    logger.info("MESSAGE_RESIDENT user=%s lot=%s objet=%s", request.user.username, membership.lot_id, objet)
    return Response(_msg_dict(msg), status=201)


# ── Resident : list my messages ────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def message_mes(request):
    """Résident : liste ses propres messages."""
    membership = (
        ResidenceMembership.objects
        .filter(user=request.user, actif=True)
        .select_related("residence")
        .first()
    )
    if not membership:
        return Response({"detail": "Aucune résidence liée."}, status=403)
    qs = (
        MessageResident.objects
        .filter(residence=membership.residence, expediteur=request.user)
        .select_related("lot")
    )
    return Response([_msg_dict(m) for m in qs])


# ── Admin : Consultation — données portail résident pour un lot ────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_resident_lot(request, lot_id):
    """Admin preview : renvoie les mêmes données que le portail résident mais pour n'importe quel lot."""
    admin_membership, err = _require_admin(request)
    if err:
        return err
    residence = admin_membership.residence

    try:
        lot = Lot.objects.get(pk=lot_id, residence=residence)
    except Lot.DoesNotExist:
        return Response({"detail": "Lot introuvable."}, status=404)

    # ── Charges ──────────────────────────────────────────────
    details = (
        DetailAppelCharge.objects
        .filter(lot=lot)
        .select_related("appel")
        .order_by("-appel__exercice", "-appel__date_emission")
    )
    charges = []
    total_du = Decimal("0")
    total_paye = Decimal("0")
    for d in details:
        montant_paye = d.montant_recu or Decimal("0")
        solde = d.montant - montant_paye
        total_du   += d.montant
        total_paye += montant_paye
        charges.append({
            "id":            d.id,
            "exercice":      d.appel.exercice,
            "periode":       d.appel.periode,
            "type_charge":   d.appel.type_charge,
            "montant_appel": str(d.montant),
            "montant_paye":  str(montant_paye),
            "solde":         str(solde),
            "statut":        d.statut,
            "statut_label":  d.get_statut_display(),
        })

    lot_data = {
        "id":           lot.id,
        "numero_lot":   lot.numero_lot,
        "type_lot":     lot.type_lot,
        "etage_lot":    lot.etage_lot,
        "total_du":     str(total_du),
        "total_paye":   str(total_paye),
        "solde_global": str(total_du - total_paye),
        "charges":      charges,
    }

    # ── Rapport ───────────────────────────────────────────────
    rapport = None
    if residence.partage_rapport_resident:
        rec = Recette.objects.filter(residence=residence).aggregate(t=Sum("montant"))["t"] or Decimal("0")
        dep = Depense.objects.filter(residence=residence).aggregate(t=Sum("montant"))["t"] or Decimal("0")
        cin = CaisseMouvement.objects.filter(residence=residence, sens="ENTREE").aggregate(t=Sum("montant"))["t"] or Decimal("0")
        cout = CaisseMouvement.objects.filter(residence=residence, sens="SORTIE").aggregate(t=Sum("montant"))["t"] or Decimal("0")
        rapport = {
            "recettes_total": str(rec),
            "depenses_total": str(dep),
            "solde_recettes": str(rec - dep),
            "caisse_entrees": str(cin),
            "caisse_sorties": str(cout),
            "solde_caisse":   str(cin - cout),
        }

    # ── Bureau ────────────────────────────────────────────────
    bureau = None
    mandat = (
        MandatBureauSyndical.objects
        .filter(residence=residence, actif=True)
        .prefetch_related("membres__personne")
        .first()
    )
    if mandat:
        bureau = {
            "date_debut": str(mandat.date_debut) if mandat.date_debut else None,
            "date_fin":   str(mandat.date_fin)   if mandat.date_fin   else None,
            "membres": [
                {
                    "id":             m.id,
                    "nom":            m.personne.nom,
                    "prenom":         m.personne.prenom,
                    "fonction":       m.fonction,
                    "fonction_label": m.get_fonction_display(),
                }
                for m in mandat.membres.select_related("personne").all()
            ],
        }

    # ── Dernière AG ───────────────────────────────────────────
    derniere_ag = None
    ag = AssembleeGenerale.objects.filter(residence=residence).order_by("-date_ag").first()
    if ag:
        derniere_ag = {
            "date_ag":       str(ag.date_ag),
            "type_ag_label": ag.get_type_ag_display(),
            "lieu":          getattr(ag, "lieu", None),
            "resolutions":   list(
                Resolution.objects
                .filter(assemblee_generale=ag, resultat="ADOPTEE")
                .values("id", "titre", "description")
            ),
        }

    # ── Documents ─────────────────────────────────────────────
    documents = list(
        DocumentGouvernance.objects
        .filter(residence=residence, visible_resident=True)
        .values("id", "titre", "type_document", "fichier", "date")
        .order_by("-date")[:20]
    )

    logo_val = None
    if residence.logo_base64:
        logo_val = residence.logo_base64
    elif residence.logo and residence.logo.name:
        logo_val = residence.logo.url

    residence_data = {
        "nom": residence.nom_residence,
        "logo": logo_val,
    }

    return Response({
        "lot":         lot_data,
        "rapport":     rapport,
        "bureau":      bureau,
        "derniere_ag": derniere_ag,
        "documents":   documents,
        "residence":   residence_data,
    })
