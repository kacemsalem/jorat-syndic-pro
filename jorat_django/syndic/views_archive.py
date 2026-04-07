"""
Archivage comptable — archive / restauration des données financières (admin only).
"""
import logging
from decimal import Decimal

from django.db import models, transaction
from django.db.models import Count, Q, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Depense, Paiement, Recette, CaisseMouvement,
    AffectationPaiement, AppelCharge,
    ArchiveComptable, ArchiveDepense, ArchivePaiement, ArchiveRecette,
    ArchiveAffectationPaiement,
)
from .views_users import _require_admin

logger = logging.getLogger(__name__)


def _fmt_date(d):
    return str(d) if d else None


def _archive_to_dict(archive):
    return {
        "id":             archive.id,
        "created_at":     str(archive.created_at)[:10],
        "start_date":     str(archive.start_date),
        "end_date":       str(archive.end_date),
        "total_recettes": str(archive.total_recettes),
        "total_depenses": str(archive.total_depenses),
        "solde":          str(archive.solde),
        "commentaire":    archive.commentaire,
        "nb_depenses":    archive.depenses.count(),
        "nb_paiements":   archive.paiements.count(),
        "nb_recettes":    archive.recettes.count(),
        "nb_appels":      archive.appels_charges.count(),
    }


# ── List ──────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def archive_list(request):
    admin_membership, err = _require_admin(request)
    if err:
        return err
    archives = ArchiveComptable.objects.filter(
        residence=admin_membership.residence
    ).prefetch_related("depenses", "paiements", "recettes")
    return Response([_archive_to_dict(a) for a in archives])


# ── Create ────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def archive_create(request):
    admin_membership, err = _require_admin(request)
    if err:
        return err
    residence = admin_membership.residence

    start_date     = request.data.get("start_date")
    end_date       = request.data.get("end_date")
    commentaire    = request.data.get("commentaire", "")
    archive_appels = request.data.get("archive_appels", False)

    if not start_date or not end_date:
        return Response({"detail": "start_date et end_date sont obligatoires."}, status=400)
    if start_date > end_date:
        return Response({"detail": "start_date doit être antérieure à end_date."}, status=400)

    with transaction.atomic():
        # ── Fetch records in range ──────────────────────────────
        depenses  = list(Depense.objects.filter(residence=residence, date_depense__range=[start_date, end_date]))
        paiements = list(Paiement.objects.filter(residence=residence, date_paiement__range=[start_date, end_date]))
        recettes  = list(Recette.objects.filter(residence=residence, date_recette__range=[start_date, end_date]))

        if not depenses and not paiements and not recettes:
            return Response({"detail": "Aucun mouvement trouvé dans cette période."}, status=400)

        # ── Compute totals ──────────────────────────────────────
        total_recettes = sum(r.montant for r in recettes) + sum(p.montant for p in paiements)
        total_depenses = sum(d.montant for d in depenses)
        solde          = total_recettes - total_depenses

        # ── Create archive registry ─────────────────────────────
        archive = ArchiveComptable.objects.create(
            residence=residence,
            start_date=start_date,
            end_date=end_date,
            total_recettes=total_recettes,
            total_depenses=total_depenses,
            solde=solde,
            commentaire=commentaire or f"Archive financière période {start_date} - {end_date}",
        )

        # ── Copy to archive tables ──────────────────────────────
        ArchiveDepense.objects.bulk_create([
            ArchiveDepense(
                archive=archive,
                residence=d.residence,
                compte=d.compte,
                categorie=d.categorie,
                fournisseur=d.fournisseur,
                date_depense=d.date_depense,
                montant=d.montant,
                libelle=d.libelle,
                detail=d.detail,
                facture_reference=d.facture_reference,
                commentaire=d.commentaire,
                mois=d.mois,
                original_id=d.id,
            ) for d in depenses
        ])

        ArchivePaiement.objects.bulk_create([
            ArchivePaiement(
                archive=archive,
                residence=p.residence,
                lot=p.lot,
                date_paiement=p.date_paiement,
                montant=p.montant,
                reference=p.reference,
                mois=p.mois,
                mode_paiement=p.mode_paiement,
                original_id=p.id,
            ) for p in paiements
        ])

        # ── Archive AffectationPaiement (ventilations) ──────────
        ap_map = {ap.original_id: ap
                  for ap in ArchivePaiement.objects.filter(archive=archive)}
        affectations = AffectationPaiement.objects.filter(
            paiement_id__in=[p.id for p in paiements]
        ).select_related("detail")
        ArchiveAffectationPaiement.objects.bulk_create([
            ArchiveAffectationPaiement(
                archive_paiement=ap_map[aff.paiement_id],
                detail=aff.detail,
                montant_affecte=aff.montant_affecte,
            )
            for aff in affectations
            if aff.paiement_id in ap_map and aff.detail_id
        ])

        ArchiveRecette.objects.bulk_create([
            ArchiveRecette(
                archive=archive,
                residence=r.residence,
                compte=r.compte,
                date_recette=r.date_recette,
                montant=r.montant,
                libelle=r.libelle,
                source=r.source,
                commentaire=r.commentaire,
                mois=r.mois,
                original_id=r.id,
            ) for r in recettes
        ])

        # ── Delete originals (cascade removes linked CaisseMouvement) ──
        # NOTE: DetailAppelCharge.montant_recu is intentionally preserved after archiving.
        # It is a permanent accounting record (the lot DID pay). The AffectationPaiement
        # cascade-delete bypasses Python delete(), which is correct here — we do NOT
        # want _rebuild_from_affectations() to reset montant_recu to 0.
        Depense.objects.filter(id__in=[d.id for d in depenses]).delete()
        Paiement.objects.filter(id__in=[p.id for p in paiements]).delete()
        Recette.objects.filter(id__in=[r.id for r in recettes]).delete()

        # ── Optionally archive AppelCharge/Fond ─────────────────
        if archive_appels:
            from .models import DetailAppelCharge as DAC
            import datetime

            # Exercices couverts par la période archivée
            start_year = int(str(start_date)[:4])
            end_year   = int(str(end_date)[:4])

            base_qs = AppelCharge.objects.filter(
                residence=residence,
                archive_comptable__isnull=True,
                exercice__gte=start_year,
                exercice__lte=end_year,
            )

            # 1. Appels totalement payés → archiver l'appel entier
            appels_full = base_qs.annotate(
                nb_details=Count("details", filter=Q(details__archived=False)),
                nb_paye=Count("details", filter=Q(details__statut="PAYE", details__archived=False)),
            ).filter(
                nb_details__gt=0,
                nb_details=models.F("nb_paye"),
            )
            appels_full.update(archive_comptable=archive)

            # 2. Appels partiellement couverts → marquer archived=True les details PAYE
            #    Conserver uniquement les lots PARTIEL et NON_PAYE
            appels_partial = base_qs.exclude(
                archive_comptable=archive  # exclure ceux qu'on vient d'archiver
            ).annotate(
                nb_details=Count("details", filter=Q(details__archived=False)),
                nb_paye=Count("details", filter=Q(details__statut="PAYE", details__archived=False)),
            ).filter(
                nb_details__gt=0,
                nb_paye__gt=0,
                nb_paye__lt=models.F("nb_details"),
            )
            DAC.objects.filter(
                appel__in=appels_partial,
                statut="PAYE",
                archived=False,
            ).update(archived=True)

        # ── Create adjustment entry in Caisse ───────────────────
        if solde != Decimal("0"):
            sens = "DEBIT" if solde > 0 else "CREDIT"
            mouvement = CaisseMouvement.objects.create(
                residence=residence,
                date_mouvement=end_date,
                type_mouvement="ARCHIVE_ADJUSTMENT",
                sens=sens,
                montant=abs(solde),
                libelle=f"Ajustement archive {start_date} → {end_date}",
                commentaire=archive.commentaire,
            )
            archive.caisse_mouvement = mouvement
            archive.save(update_fields=["caisse_mouvement"])

    logger.info(
        "ARCHIVE_CREATE user=%s residence=%s period=%s→%s dep=%d pai=%d rec=%d solde=%s",
        request.user.username, residence.pk,
        start_date, end_date,
        len(depenses), len(paiements), len(recettes), solde,
    )

    return Response(_archive_to_dict(archive), status=201)


# ── Restore ───────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def archive_restore(request, pk):
    admin_membership, err = _require_admin(request)
    if err:
        return err
    residence = admin_membership.residence

    try:
        archive = ArchiveComptable.objects.prefetch_related(
            "depenses", "paiements", "recettes"
        ).get(pk=pk, residence=residence)
    except ArchiveComptable.DoesNotExist:
        return Response({"detail": "Archive introuvable."}, status=404)

    with transaction.atomic():
        # ── Remove caisse adjustment ────────────────────────────
        if archive.caisse_mouvement_id:
            CaisseMouvement.objects.filter(pk=archive.caisse_mouvement_id).delete()

        # ── Restore Depenses (use bulk_create, then manually create caisse) ──
        for ad in archive.depenses.all():
            d = Depense(
                residence=ad.residence,
                compte=ad.compte,
                categorie=ad.categorie,
                fournisseur=ad.fournisseur,
                date_depense=ad.date_depense,
                montant=ad.montant,
                libelle=ad.libelle,
                detail=ad.detail,
                facture_reference=ad.facture_reference,
                commentaire=ad.commentaire,
                mois=ad.mois,
            )
            d.save()  # triggers auto CaisseMouvement creation

        # ── Restore Paiements + leurs ventilations ──────────────
        for ap in archive.paiements.prefetch_related("affectations__detail").all():
            if not ap.lot_id:
                continue  # lot was deleted, skip
            p = Paiement(
                residence=ap.residence,
                lot=ap.lot,
                date_paiement=ap.date_paiement,
                montant=ap.montant,
                reference=ap.reference,
                mois=ap.mois,
                mode_paiement=ap.mode_paiement,
            )
            p.save()  # triggers auto CaisseMouvement creation

            # Recreate affectations — calls _rebuild_from_affectations via save()
            for aaf in ap.affectations.all():
                if not aaf.detail_id:
                    continue
                try:
                    AffectationPaiement.objects.create(
                        paiement=p,
                        detail=aaf.detail,
                        montant_affecte=aaf.montant_affecte,
                    )
                except Exception:
                    pass  # detail deleted or constraint issue — skip gracefully

        # ── Restore Recettes ────────────────────────────────────
        for ar in archive.recettes.all():
            r = Recette(
                residence=ar.residence,
                compte=ar.compte,
                date_recette=ar.date_recette,
                montant=ar.montant,
                libelle=ar.libelle,
                source=ar.source,
                commentaire=ar.commentaire,
                mois=ar.mois,
            )
            r.save()  # triggers auto CaisseMouvement creation

        # ── Delete archive ──────────────────────────────────────
        archive.delete()

    logger.info(
        "ARCHIVE_RESTORE user=%s residence=%s archive_id=%s",
        request.user.username, residence.pk, pk,
    )

    return Response({"detail": "Archive restaurée avec succès."})
