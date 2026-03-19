import json
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.contrib.auth.decorators import login_required
from django.db.models import Sum
from decimal import Decimal

from .models import (
    ResidenceMembership,
    DetailAppelCharge,
    AppelCharge,
    MandatBureauSyndical,
    AssembleeGenerale,
    Resolution,
    DocumentGouvernance,
    CaisseMouvement,
    Depense,
    Recette,
)


def _json(data, status=200):
    return JsonResponse(data, status=status, safe=isinstance(data, dict))


@require_GET
def resident_portal_view(request):
    # Always return JSON — never HTML
    if not request.user.is_authenticated:
        return _json({"detail": "Non authentifié."}, status=401)

    membership = ResidenceMembership.objects.filter(
        user=request.user,
        actif=True,
    ).select_related("residence", "lot", "lot__groupe", "lot__representant").first()

    if not membership:
        return _json({"detail": "Aucune résidence liée à ce compte."}, status=403)

    residence = membership.residence
    lot = membership.lot if membership.role == "RESIDENT" else None

    # ── 1. Lot + appels de charges ────────────────────────────
    lot_data = None
    if lot:
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
                "code":          d.appel.code_fond,
                "exercice":      d.appel.exercice,
                "periode":       d.appel.periode,
                "type_charge":   d.appel.type_charge,
                "montant_appel": str(d.montant),
                "montant_paye":  str(montant_paye),
                "solde":         str(solde),
                "statut":        d.statut,
                "statut_label":  d.get_statut_display(),
                "date_emission": str(d.appel.date_emission) if d.appel.date_emission else None,
            })

        lot_data = {
            "id":           lot.id,
            "numero_lot":   lot.numero_lot,
            "groupe":       lot.groupe.nom_groupe if lot.groupe else None,
            "representant": (
                f"{lot.representant.nom} {lot.representant.prenom or ''}".strip()
                if lot.representant else None
            ),
            "total_du":     str(total_du),
            "total_paye":   str(total_paye),
            "solde_global": str(total_du - total_paye),
            "charges":      charges,
        }

    # ── 2. Rapport financier (si partagé) ─────────────────────
    rapport = None
    if residence.partage_rapport_resident:
        recettes_total = Recette.objects.filter(residence=residence).aggregate(
            t=Sum("montant"))["t"] or Decimal("0")
        depenses_total = Depense.objects.filter(residence=residence).aggregate(
            t=Sum("montant"))["t"] or Decimal("0")
        caisse_entrees = CaisseMouvement.objects.filter(
            residence=residence, sens="ENTREE").aggregate(t=Sum("montant"))["t"] or Decimal("0")
        caisse_sorties = CaisseMouvement.objects.filter(
            residence=residence, sens="SORTIE").aggregate(t=Sum("montant"))["t"] or Decimal("0")
        rapport = {
            "recettes_total": str(recettes_total),
            "depenses_total": str(depenses_total),
            "solde_recettes": str(recettes_total - depenses_total),
            "caisse_entrees": str(caisse_entrees),
            "caisse_sorties": str(caisse_sorties),
            "solde_caisse":   str(caisse_entrees - caisse_sorties),
        }

    # ── 3. Bureau syndical actif ──────────────────────────────
    bureau = None
    mandat = (
        MandatBureauSyndical.objects
        .filter(residence=residence, actif=True)
        .prefetch_related("membres__personne")
        .first()
    )
    if mandat:
        membres = []
        for m in mandat.membres.select_related("personne").all():
            membres.append({
                "id":             m.id,
                "nom":            m.personne.nom,
                "prenom":         m.personne.prenom,
                "fonction":       m.fonction,
                "fonction_label": m.get_fonction_display(),
            })
        bureau = {
            "id":         mandat.id,
            "date_debut": str(mandat.date_debut) if mandat.date_debut else None,
            "date_fin":   str(mandat.date_fin)   if mandat.date_fin   else None,
            "membres":    membres,
        }

    # ── 4. Dernière AG + résolutions adoptées ─────────────────
    derniere_ag = None
    ag = AssembleeGenerale.objects.filter(residence=residence).order_by("-date_ag").first()
    if ag:
        resolutions = list(
            Resolution.objects
            .filter(assemblee_generale=ag, resultat="ADOPTEE")
            .values("id", "titre", "description", "resultat")
        )
        derniere_ag = {
            "id":            ag.id,
            "date_ag":       str(ag.date_ag),
            "type_ag":       ag.type_ag,
            "type_ag_label": ag.get_type_ag_display(),
            "statut":        ag.statut,
            "lieu": getattr(ag, "lieu", None),
            "resolutions":   resolutions,
        }

    # ── 5. Documents visibles aux résidents ───────────────────
    documents = list(
        DocumentGouvernance.objects
        .filter(residence=residence, visible_resident=True)
        .values("id", "titre", "type_document", "fichier", "date")
        .order_by("-date")[:20]
    )

    return _json({
        "residence":   {
            "nom":  residence.nom_residence,
            "logo": residence.logo.url if residence.logo else None,
        },
        "lot":         lot_data,
        "rapport":     rapport,
        "bureau":      bureau,
        "derniere_ag": derniere_ag,
        "documents":   documents,
    })
