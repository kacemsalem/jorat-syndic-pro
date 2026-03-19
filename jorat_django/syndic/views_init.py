"""
Initialisation complète — réinitialise les données opérationnelles (admin only).
"""
import logging
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    AppelCharge,
    DetailAppelCharge,
    Paiement,
    AffectationPaiement,
    Depense,
    Recette,
    CaisseMouvement,
)
from .views import get_user_residence
from .views_users import _require_admin

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def init_complete(request):
    admin_membership, err = _require_admin(request)
    if err:
        return err

    residence = admin_membership.residence

    with transaction.atomic():
        counts = {}
        counts["affectations"]    = AffectationPaiement.objects.filter(detail__appel__residence=residence).delete()[0]
        counts["details_appel"]   = DetailAppelCharge.objects.filter(appel__residence=residence).delete()[0]
        counts["appels_charge"]   = AppelCharge.objects.filter(residence=residence).delete()[0]
        counts["paiements"]       = Paiement.objects.filter(residence=residence).delete()[0]
        counts["depenses"]        = Depense.objects.filter(residence=residence).delete()[0]
        counts["recettes"]        = Recette.objects.filter(residence=residence).delete()[0]
        counts["caisse"]          = CaisseMouvement.objects.filter(residence=residence).delete()[0]

    logger.warning(
        "INIT_COMPLETE by user=%s (id=%s) on residence=%s (id=%s) — %s",
        request.user.username,
        request.user.pk,
        residence.nom_residence,
        residence.pk,
        counts,
    )

    return Response({
        "detail": "Initialisation complète effectuée avec succès.",
        "counts": counts,
    })
