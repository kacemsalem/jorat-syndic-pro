"""
Vues pour les résolutions par vote.
"""
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ResolutionVote, VoteResident, NotificationVote, Lot
from .serializers import ResolutionVoteSerializer


# ── Helpers ─────────────────────────────────────────────────

def _get_residence(request):
    from .models import ResidenceMembership
    m = ResidenceMembership.objects.filter(user=request.user, actif=True).select_related("residence").first()
    return m.residence if m else None


def _get_resident_lot(request, residence):
    from .models import ResidenceMembership
    m = ResidenceMembership.objects.filter(
        user=request.user, residence=residence, role="RESIDENT", actif=True
    ).select_related("lot").first()
    return m.lot if m else None


# ── Admin ────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def resolution_vote_list_create(request):
    residence = _get_residence(request)
    if not residence:
        return Response({"detail": "Aucune résidence."}, status=400)

    if request.method == "GET":
        qs = ResolutionVote.objects.filter(residence=residence)
        return Response(ResolutionVoteSerializer(qs, many=True).data)

    d = request.data
    rv = ResolutionVote.objects.create(
        residence         = residence,
        assemblee_id      = d.get("assemblee") or None,
        intitule          = d.get("intitule", ""),
        description       = d.get("description", ""),
        type_vote         = d.get("type_vote", "MAJORITE_SIMPLE"),
        date_resolution   = d.get("date_resolution"),
        date_debut_vote   = d.get("date_debut_vote") or None,
        date_cloture_vote = d.get("date_cloture_vote") or None,
        statut            = d.get("statut", "EN_PREPARATION"),
    )
    return Response(ResolutionVoteSerializer(rv).data, status=201)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def resolution_vote_detail(request, pk):
    residence = _get_residence(request)
    try:
        rv = ResolutionVote.objects.get(pk=pk, residence=residence)
    except ResolutionVote.DoesNotExist:
        return Response(status=404)

    if request.method == "GET":
        return Response(ResolutionVoteSerializer(rv).data)

    if request.method == "PATCH":
        for field in ["intitule", "description", "type_vote", "date_resolution", "statut"]:
            if field in request.data:
                setattr(rv, field, request.data[field])
        for field in ["date_debut_vote", "date_cloture_vote"]:
            if field in request.data:
                setattr(rv, field, request.data[field] or None)
        if "assemblee" in request.data:
            rv.assemblee_id = request.data["assemblee"] or None
        rv.save()
        return Response(ResolutionVoteSerializer(rv).data)

    rv.delete()
    return Response(status=204)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resolution_vote_envoyer_notifs(request, pk):
    """Crée des NotificationVote pour tous les lots + passe statut EN_COURS."""
    residence = _get_residence(request)
    try:
        rv = ResolutionVote.objects.get(pk=pk, residence=residence)
    except ResolutionVote.DoesNotExist:
        return Response(status=404)

    lots = Lot.objects.filter(residence=residence)
    created = 0
    for lot in lots:
        _, was_created = NotificationVote.objects.get_or_create(resolution=rv, lot=lot)
        if was_created:
            created += 1

    if rv.statut == "EN_PREPARATION":
        rv.statut = "EN_COURS"
        rv.save()

    return Response({"sent": created, "total_lots": lots.count(), "statut": rv.statut})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resolution_vote_resultats(request, pk):
    """Résultats complets : comptage + tableau par lot."""
    residence = _get_residence(request)
    try:
        rv = ResolutionVote.objects.get(pk=pk, residence=residence)
    except ResolutionVote.DoesNotExist:
        return Response(status=404)

    notifs = {n.lot_id: n for n in rv.notifications_vote.select_related("lot")}
    votes  = {v.lot_id: v for v in rv.votes.select_related("lot")}
    lots   = Lot.objects.filter(residence=residence).select_related("groupe").order_by("groupe__nom_groupe", "numero_lot")

    detail = []
    for lot in lots:
        n = notifs.get(lot.id)
        v = votes.get(lot.id)
        detail.append({
            "lot":              lot.numero_lot,
            "lot_id":           lot.id,
            "notifie":          n is not None,
            "accuse_reception": (n.acknowledged_at is not None) if n else False,
            "vote":             v.choix if v else None,
        })

    counts = {"OUI": 0, "NON": 0, "NEUTRE": 0}
    for v in votes.values():
        counts[v.choix] = counts.get(v.choix, 0) + 1

    return Response({
        "resolution":    ResolutionVoteSerializer(rv).data,
        "counts":        counts,
        "total_notifies": len(notifs),
        "total_votes":   len(votes),
        "detail":        detail,
    })


# ── Résident ────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resolution_vote_mes(request):
    """Résolutions avec notifications pour le lot du résident."""
    residence = _get_residence(request)
    if not residence:
        return Response([])
    lot = _get_resident_lot(request, residence)
    if not lot:
        return Response({"detail": "Aucun lot associé à votre compte."}, status=400)

    notifs = NotificationVote.objects.filter(lot=lot).select_related("resolution")
    now    = timezone.now()
    result = []
    for n in notifs:
        rv   = n.resolution
        vote = VoteResident.objects.filter(resolution=rv, lot=lot).first()
        peut_voter = rv.statut_effectif == "EN_COURS"
        result.append({
            "id":               rv.id,
            "intitule":         rv.intitule,
            "description":      rv.description,
            "type_vote":        rv.type_vote,
            "type_vote_label":  rv.get_type_vote_display(),
            "date_resolution":  str(rv.date_resolution),
            "date_debut_vote":  rv.date_debut_vote.isoformat() if rv.date_debut_vote else None,
            "date_cloture_vote": rv.date_cloture_vote.isoformat() if rv.date_cloture_vote else None,
            "statut":           rv.statut,
            "notif_id":         n.id,
            "accuse_reception": n.acknowledged_at is not None,
            "mon_vote":         vote.choix if vote else None,
            "peut_voter":       peut_voter,
        })
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resolution_vote_accuser(request, pk):
    """Résident accuse réception."""
    residence = _get_residence(request)
    lot = _get_resident_lot(request, residence)
    if not lot:
        return Response({"detail": "Lot non associé."}, status=400)
    try:
        n = NotificationVote.objects.get(resolution_id=pk, lot=lot)
    except NotificationVote.DoesNotExist:
        return Response(status=404)
    if not n.acknowledged_at:
        n.acknowledged_at = timezone.now()
        n.save()
    return Response({"ok": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resolution_vote_voter(request, pk):
    """Résident vote sur une résolution."""
    residence = _get_residence(request)
    lot = _get_resident_lot(request, residence)
    if not lot:
        return Response({"detail": "Lot non associé."}, status=400)

    try:
        rv = ResolutionVote.objects.get(pk=pk, residence=residence)
    except ResolutionVote.DoesNotExist:
        return Response(status=404)

    statut_eff = rv.statut_effectif
    if statut_eff == "EN_PREPARATION":
        return Response({"detail": "Le vote n'est pas encore ouvert."}, status=400)
    if statut_eff == "CLOTURE":
        return Response({"detail": "Cette résolution est clôturée."}, status=400)

    choix = request.data.get("choix")
    if choix not in ("OUI", "NON", "NEUTRE"):
        return Response({"detail": "Choix invalide (OUI / NON / NEUTRE)."}, status=400)

    vote, created = VoteResident.objects.update_or_create(
        resolution=rv, lot=lot,
        defaults={"choix": choix, "user": request.user},
    )
    return Response({"choix": vote.choix, "created": created})
