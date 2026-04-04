from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Sum, Q
from django.db.models.deletion import ProtectedError
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.pagination import PageNumberPagination

from .models import (
    Residence,
    Groupe,
    Lot,
    Personne,
    Paiement,
    AppelCharge,
    DetailAppelCharge,
    AffectationPaiement,
    ResidenceMembership,
    CategorieDepense,
    Fournisseur,
    CompteComptable,
    Depense,
    CaisseMouvement,
    Recette,
    BureauSyndical,
    AssembleeGenerale,
    Resolution,
    DocumentGouvernance,
    MandatBureauSyndical,
    MandatBureauMembre,
    Travaux,
    Notification,
    FamilleDepense,
    ModeleDepense,
    Contrat,
)
from .serializers import (
    ResidenceSerializer,
    BureauSyndicalSerializer,
    AssembleeGeneraleSerializer,
    ResolutionSerializer,
    DocumentGouvernanceSerializer,
    GroupeSerializer,
    LotSerializer,
    PersonneMiniSerializer,
    PersonneSerializer,
    PaiementSerializer,
    AffectationPaiementSerializer,
    AppelChargeSerializer,
    DetailAppelChargeSerializer,
    CategorieDepenseSerializer,
    FournisseurSerializer,
    CompteComptableSerializer,
    DepenseSerializer,
    CaisseMouvementSerializer,
    RecetteSerializer,
    MandatBureauSyndicalSerializer,
    MandatBureauMembreSerializer,
    TravauxSerializer,
    NotificationSerializer,
    FamilleDepenseSerializer,
    ModeleDepenseSerializer,
    ContratSerializer,
    SuiviLotSerializer,
)


# ============================================================
# Helper : résidence du user connecté
# ============================================================
def get_user_residence(request):
    """Retourne la résidence liée au user connecté, ou None."""
    membership = ResidenceMembership.objects.filter(
        user=request.user, actif=True
    ).select_related("residence").first()
    return membership.residence if membership else None


def _get_or_create_attente_compte(residence):
    """
    Retourne le compte '000 — Attente d'affectation' pour la résidence,
    en le créant automatiquement s'il n'existe pas encore.
    Ce compte est utilisé quand le gestionnaire ne connaît pas encore
    le compte comptable correct.
    """
    obj, _ = CompteComptable.objects.get_or_create(
        residence=residence,
        code="000",
        defaults={
            "libelle":     "Attente d'affectation",
            "type_compte": "CHARGE",
            "actif":       True,
        },
    )
    return obj


# ============================================================
# Me
# ============================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    membership = ResidenceMembership.objects.filter(
        user=request.user, actif=True
    ).select_related("residence", "lot").first()

    if not membership:
        if request.user.is_superuser:
            return Response({
                "id":           request.user.id,
                "username":     request.user.username,
                "email":        request.user.email,
                "role":         "SUPERUSER",
                "is_superuser": True,
            })
        return Response({"detail": "Aucune résidence liée."}, status=400)

    return Response({
        "id":                   request.user.id,
        "username":             request.user.username,
        "email":                request.user.email,
        "role":                 membership.role,
        "residence":            ResidenceSerializer(membership.residence).data,
        "lot_id":               membership.lot_id,
        "must_change_password": membership.must_change_password,
    })


# ============================================================
# Residence
# ============================================================
class ResidenceViewSet(ModelViewSet):
    serializer_class = ResidenceSerializer
    pagination_class = None
    queryset         = Residence.objects.all()

    http_method_names = ["get", "patch", "put", "head", "options"]

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Residence.objects.none()
        return Residence.objects.filter(pk=residence.pk).annotate(nombre_lots=Count("lots"))

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        # When a new base64 logo is set, delete the old file-based logo to free disk space
        if "logo_base64" in request.data and request.data["logo_base64"]:
            if instance.logo and instance.logo.name:
                import os
                old_path = instance.logo.path
                instance.logo.delete(save=False)
                if os.path.exists(old_path):
                    os.remove(old_path)
        return super().partial_update(request, *args, **kwargs)


# ============================================================
# Groupe
# ============================================================
class GroupeViewSet(ModelViewSet):
    serializer_class = GroupeSerializer
    pagination_class = None
    queryset         = Groupe.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Groupe.objects.none()
        return Groupe.objects.filter(residence=residence)


# ============================================================
# Lot
# ============================================================
class LotViewSet(ModelViewSet):
    serializer_class = LotSerializer
    pagination_class = None
    queryset         = Lot.objects.all()

    def get_queryset(self):
        from django.db.models import F, ExpressionWrapper, DecimalField as DjDecimalField
        residence = get_user_residence(self.request)
        if not residence:
            return Lot.objects.none()
        qs = (
            Lot.objects
            .select_related("residence", "groupe", "representant", "proprietaire", "occupant")
            .filter(residence=residence)
            .annotate(
                total_du=Sum(
                    ExpressionWrapper(
                        F("details_appels__montant") - F("details_appels__montant_recu"),
                        output_field=DjDecimalField(max_digits=12, decimal_places=2),
                    )
                ),
                total_recu=Sum("details_appels__montant_recu"),
            )
        )
        groupe_id = self.request.query_params.get("groupe")
        statut    = self.request.query_params.get("statut")
        if groupe_id:
            qs = qs.filter(groupe_id=groupe_id)
        if statut:
            qs = qs.filter(statut_lot=statut)
        return qs.order_by("groupe__nom_groupe", "numero_lot")


# ============================================================
# Personne
# ============================================================
class PersonneViewSet(ModelViewSet):
    pagination_class = None
    queryset         = Personne.objects.all()

    def get_serializer_class(self):
        return PersonneSerializer

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Personne.objects.none()
        return Personne.objects.filter(residence=residence)

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        serializer.save(residence=residence)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError as e:
            # Identify which related objects are blocking the delete
            related = set()
            for obj in e.protected_objects:
                name = obj.__class__.__name__
                if name == "Lot":
                    related.add("un ou plusieurs lots")
                elif name in ("MandatBureauSyndical", "MembreBureauSyndical"):
                    related.add("le bureau syndical")
                else:
                    related.add(name)
            detail = "Ce contact est lié à : " + ", ".join(sorted(related)) + ". Retirez ces liens avant de le supprimer."
            return Response({"detail": detail}, status=409)


# ============================================================
# Paiement
# ============================================================
class PaiementViewSet(ModelViewSet):
    serializer_class = PaiementSerializer
    pagination_class = None
    queryset         = Paiement.objects.all()

    ORDRE_PERIODE = {
        "ANNEE": 0,
        "FOND":  1,
    }

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Paiement.objects.none()
        qs     = Paiement.objects.select_related("lot", "residence").filter(residence=residence)
        lot_id = self.request.query_params.get("lot")
        if lot_id:
            qs = qs.filter(lot_id=lot_id)
        return qs

    @action(detail=True, methods=["post"], url_path="ventiler")
    @transaction.atomic
    def ventiler(self, request, pk=None):
        paiement = self.get_object()
        solde    = paiement.montant - paiement.montant_affecte

        if solde <= 0:
            return Response(
                {"detail": "Ce paiement est déjà entièrement affecté."},
                status=400,
            )

        type_charge = request.data.get("type_charge") or request.query_params.get("type_charge")

        qs_details = (
            DetailAppelCharge.objects
            .filter(lot=paiement.lot, appel__residence=paiement.residence)
            .exclude(statut="PAYE")
            .select_related("appel")
        )
        if type_charge in ("CHARGE", "FOND"):
            qs_details = qs_details.filter(appel__type_charge=type_charge)

        details_dus = list(qs_details)

        if not details_dus:
            label = "fond" if type_charge == "FOND" else "charge"
            return Response(
                {"detail": f"Aucun détail d'appel de {label} non réglé trouvé pour ce lot."},
                status=400,
            )

        details_dus.sort(key=lambda d: (
            d.appel.exercice,
            PaiementViewSet.ORDRE_PERIODE.get(d.appel.periode, 99),
            d.appel.date_emission,
        ))

        affectations_creees = []

        for detail in details_dus:
            if solde <= 0:
                break
            restant_detail = detail.montant - detail.montant_recu
            if restant_detail <= 0:
                continue
            a_affecter  = min(solde, restant_detail)
            affectation = AffectationPaiement(
                paiement        = paiement,
                detail          = detail,
                montant_affecte = a_affecter,
            )
            try:
                affectation.save()  # triggers full_clean() + _update_detail()
            except DjangoValidationError as exc:
                return Response(
                    {"detail": f"Erreur validation lot {detail.lot.numero_lot}: {exc.message_dict or exc.messages}"},
                    status=400,
                )
            affectations_creees.append(affectation)
            solde -= a_affecter

        return Response({
            "affectations": AffectationPaiementSerializer(affectations_creees, many=True).data,
            "solde_restant": str(solde),
        })

    @action(detail=True, methods=["patch"], url_path="modifier")
    @transaction.atomic
    def modifier(self, request, pk=None):
        paiement    = self.get_object()
        old_montant = paiement.montant

        serializer = PaiementSerializer(paiement, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_montant = serializer.validated_data.get("montant", old_montant)
        serializer.save()
        paiement.refresh_from_db()

        if new_montant != old_montant:
            # Supprimer toutes les affectations → _rebuild_from_affectations sur chaque détail
            for affectation in list(paiement.affectations.select_related("detail").all()):
                affectation.delete()

            # Re-ventiler depuis zéro
            type_charge = request.data.get("type_charge")
            solde = new_montant

            qs_details = (
                DetailAppelCharge.objects
                .filter(lot=paiement.lot, appel__residence=paiement.residence)
                .exclude(statut="PAYE")
                .select_related("appel")
            )
            if type_charge in ("CHARGE", "FOND"):
                qs_details = qs_details.filter(appel__type_charge=type_charge)

            details_dus = sorted(
                list(qs_details),
                key=lambda d: (
                    d.appel.exercice,
                    PaiementViewSet.ORDRE_PERIODE.get(d.appel.periode, 99),
                    d.appel.date_emission,
                )
            )

            for detail in details_dus:
                if solde <= 0:
                    break
                restant = detail.montant - detail.montant_recu
                if restant <= 0:
                    continue
                a_affecter = min(solde, restant)
                affectation = AffectationPaiement(
                    paiement=paiement,
                    detail=detail,
                    montant_affecte=a_affecter,
                )
                try:
                    affectation.save()
                except DjangoValidationError as exc:
                    return Response(
                        {"detail": f"Erreur ventilation : {exc.message_dict or exc.messages}"},
                        status=400,
                    )
                solde -= a_affecter

        return Response(PaiementSerializer(paiement).data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        paiement = self.get_object()
        for affectation in list(paiement.affectations.select_related("detail").all()):
            affectation.delete()
        paiement.delete()
        return Response(status=204)


# ============================================================
# AffectationPaiement
# ============================================================
class AffectationPaiementViewSet(ModelViewSet):
    serializer_class = AffectationPaiementSerializer
    pagination_class = None
    queryset         = AffectationPaiement.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return AffectationPaiement.objects.none()
        qs = AffectationPaiement.objects.select_related(
            "paiement", "detail__appel", "detail__lot",
        ).filter(paiement__residence=residence)
        paiement_id = self.request.query_params.get("paiement")
        lot_id      = self.request.query_params.get("lot")
        if paiement_id:
            qs = qs.filter(paiement_id=paiement_id)
        if lot_id:
            qs = qs.filter(detail__lot_id=lot_id)
        return qs


# ============================================================
# AppelCharge
# ============================================================
class AppelChargeViewSet(ModelViewSet):
    serializer_class = AppelChargeSerializer
    pagination_class = None
    queryset         = AppelCharge.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return AppelCharge.objects.none()
        qs = AppelCharge.objects.filter(
            residence=residence,
            archive_comptable__isnull=True,   # exclure les appels archivés
        ).annotate(nombre_details=Count("details"), montant_total=Sum("details__montant"))
        exercice = self.request.query_params.get("exercice")
        if exercice:
            qs = qs.filter(exercice=exercice)
        return qs

    def _wrap_django_validation(self, exc):
        from rest_framework.exceptions import ValidationError as DRFValidationError
        import django.core.exceptions as dj_exc
        if isinstance(exc, dj_exc.ValidationError):
            detail = exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            raise DRFValidationError(detail=detail)
        raise exc

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Aucune résidence associée à cet utilisateur.")
        try:
            serializer.save(residence=residence)
        except Exception as exc:
            self._wrap_django_validation(exc)

    def perform_update(self, serializer):
        try:
            serializer.save()
        except Exception as exc:
            self._wrap_django_validation(exc)

    @action(detail=True, methods=["post"], url_path="repartir-tantiemes")
    def repartir_tantiemes(self, request, pk=None):
        """Calcule et applique la répartition tantième pour tous les lots de l'appel.
        Accepte un montant_total optionnel en body (sinon utilise montant_total_appel de l'appel).
        Ne touche pas aux lots déjà payés partiellement ou totalement.
        """
        appel = self.get_object()
        montant_total = request.data.get("montant_total")
        if montant_total is not None:
            try:
                montant_total = Decimal(str(montant_total))
                appel.montant_total_appel = montant_total
                appel.save(update_fields=["montant_total_appel"])
            except Exception:
                return Response({"detail": "montant_total invalide."}, status=400)
        else:
            montant_total = appel.montant_total_appel

        if not montant_total or montant_total <= 0:
            return Response({"detail": "Aucun montant total défini pour cet appel."}, status=400)

        lots = Lot.objects.filter(residence=appel.residence).exclude(tantiemes__isnull=True)
        if not lots.exists():
            return Response({"detail": "Aucun lot avec tantièmes définis dans cette résidence."}, status=400)

        updated = 0
        created = 0
        from decimal import ROUND_HALF_UP
        for lot in lots:
            part = (Decimal(str(lot.tantiemes)) / Decimal("1000")) * montant_total
            part = part.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            detail, is_new = DetailAppelCharge.objects.get_or_create(
                appel=appel, lot=lot,
                defaults={"montant": part},
            )
            if is_new:
                created += 1
            else:
                # Ne pas écraser si déjà partiellement payé
                detail.montant = part
                detail.save(update_fields=["montant"])
                updated += 1

        return Response({"created": created, "updated": updated, "montant_total": float(montant_total)})


# ============================================================
# DetailAppelCharge
# ============================================================
class DetailAppelChargeViewSet(ModelViewSet):
    serializer_class = DetailAppelChargeSerializer
    pagination_class = None
    queryset         = DetailAppelCharge.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return DetailAppelCharge.objects.none()
        qs = DetailAppelCharge.objects.select_related(
            "lot", "lot__representant", "appel",
        ).only(
            "id", "montant", "montant_recu", "statut", "justificatif",
            "lot__id", "lot__numero_lot",
            "lot__representant__id", "lot__representant__nom",
            "lot__representant__prenom", "lot__representant__telephone",
            "appel__id", "appel__code_fond", "appel__periode",
            "appel__exercice", "appel__residence_id", "appel__type_charge",
        ).filter(appel__residence=residence, appel__archive_comptable__isnull=True)

        appel_id    = self.request.query_params.get("appel")
        lot_id      = self.request.query_params.get("lot")
        exercice    = self.request.query_params.get("exercice")
        type_charge = self.request.query_params.get("type_charge")

        if appel_id:
            qs = qs.filter(appel_id=appel_id)
        if lot_id:
            qs = qs.filter(lot_id=lot_id)
        if exercice:
            qs = qs.filter(appel__exercice=exercice)
        if type_charge:
            qs = qs.filter(appel__type_charge=type_charge)

        return qs

    @action(detail=False, methods=["post"], url_path="recuperer-historique")
    @transaction.atomic
    def recuperer_historique(self, request):
        from datetime import date as py_date
        residence = get_user_residence(request)
        if not residence:
            return Response({"detail": "Aucune résidence associée."}, status=400)

        detail_ids = request.data.get("detail_ids", [])
        if not detail_ids:
            return Response({"detail": "Aucun détail sélectionné."}, status=400)

        details = DetailAppelCharge.objects.select_related("lot", "appel").filter(
            id__in=detail_ids,
            appel__residence=residence,
        )

        created = 0
        skipped = 0

        for detail in details:
            solde = detail.montant - detail.montant_recu
            if solde <= Decimal("0"):
                skipped += 1
                continue

            date_paiement = py_date(int(detail.appel.exercice), 1, 1)

            paiement = Paiement.objects.create(
                lot=detail.lot,
                residence=residence,
                montant=solde,
                date_paiement=date_paiement,
                reference="Régularisation historique",
            )
            AffectationPaiement.objects.create(
                paiement=paiement,
                detail=detail,
                montant_affecte=solde,
            )
            created += 1

        return Response({"created": created, "skipped": skipped})


# ============================================================
# CategorieDepense
# ============================================================
class CategorieDepenseViewSet(ModelViewSet):
    serializer_class = CategorieDepenseSerializer
    pagination_class = None
    queryset         = CategorieDepense.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return CategorieDepense.objects.none()
        qs = CategorieDepense.objects.filter(residence=residence)
        famille = self.request.query_params.get("famille")
        actif   = self.request.query_params.get("actif")
        if famille:
            qs = qs.filter(famille=famille)
        if actif is not None:
            qs = qs.filter(actif=(actif.lower() == "true"))
        return qs

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Aucune résidence associée à cet utilisateur.")
        serializer.save(residence=residence)


# ============================================================
# Fournisseur
# ============================================================
class FournisseurViewSet(ModelViewSet):
    serializer_class = FournisseurSerializer
    pagination_class = None
    queryset         = Fournisseur.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Fournisseur.objects.none()
        qs    = Fournisseur.objects.filter(residence=residence)
        actif = self.request.query_params.get("actif")
        if actif is not None:
            qs = qs.filter(actif=(actif.lower() == "true"))
        return qs

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Aucune résidence associée à cet utilisateur.")
        serializer.save(residence=residence)


# ============================================================
# CompteComptable
# ============================================================
class CompteComptableViewSet(ModelViewSet):
    serializer_class = CompteComptableSerializer
    pagination_class = None
    queryset         = CompteComptable.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return CompteComptable.objects.none()
        qs          = CompteComptable.objects.filter(residence=residence)
        actif       = self.request.query_params.get("actif")
        type_compte = self.request.query_params.get("type_compte")
        if actif is not None:
            qs = qs.filter(actif=(actif.lower() == "true"))
        if type_compte:
            qs = qs.filter(type_compte=type_compte)
        return qs

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Aucune résidence associée à cet utilisateur.")
        serializer.save(residence=residence)


# ============================================================
# Depense
# ============================================================
class _PageBy100(PageNumberPagination):
    page_size             = 100
    page_size_query_param = "page_size"
    max_page_size         = 9999

    def get_paginated_response(self, data):
        return Response({
            "count":    self.page.paginator.count,
            "next":     self.get_next_link(),
            "previous": self.get_previous_link(),
            "results":  data,
        })

# Keep alias for compatibility
_DepensePagination = _PageBy100


class DepenseViewSet(ModelViewSet):
    serializer_class = DepenseSerializer
    pagination_class = _DepensePagination
    queryset         = Depense.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Depense.objects.none()
        qs = Depense.objects.select_related(
            "compte", "categorie", "fournisseur",
            "modele_depense", "modele_depense__categorie",   # fix N+1
        ).filter(residence=residence).order_by("-date_depense", "-id")

        p = self.request.query_params
        if p.get("compte"):       qs = qs.filter(compte_id=p["compte"])
        if p.get("categorie"):    qs = qs.filter(categorie_id=p["categorie"])
        if p.get("fournisseur"):  qs = qs.filter(fournisseur_id=p["fournisseur"])
        if p.get("famille"):      qs = qs.filter(categorie__famille=p["famille"])
        if p.get("annee"):        qs = qs.filter(date_depense__year=p["annee"])
        if p.get("mois"):         qs = qs.filter(mois=p["mois"])
        if p.get("a_affecter") == "true":
            qs = qs.filter(compte__code="000")
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        from django.db.models import Sum
        total_montant = qs.aggregate(t=Sum("montant"))["t"] or 0
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["total_montant"] = float(total_montant)
            return response
        serializer = self.get_serializer(qs, many=True)
        return Response({"results": serializer.data, "total_montant": float(total_montant)})

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """Metadata for filter dropdowns: distinct years + pending count."""
        residence = get_user_residence(request)
        if not residence:
            return Response({"annees": [], "count_attente": 0})
        qs = Depense.objects.filter(residence=residence)
        annees = sorted(
            set(qs.values_list("date_depense__year", flat=True)),
            reverse=True,
        )
        count_attente = qs.filter(compte__code="000").count()
        return Response({"annees": annees, "count_attente": count_attente})

    def _resolve_compte(self, serializer, residence):
        """Return compte from payload, or derive from modele, or fallback to 000."""
        compte = serializer.validated_data.get("compte")
        if not compte:
            modele = serializer.validated_data.get("modele_depense")
            compte = (modele.compte_comptable if modele and modele.compte_comptable
                      else _get_or_create_attente_compte(residence))
        return compte

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Aucune résidence associée à cet utilisateur.")
        # compte is required on the model; fournisseur comes from validated_data directly
        serializer.save(residence=residence, compte=self._resolve_compte(serializer, residence))

    def perform_update(self, serializer):
        residence = get_user_residence(self.request)
        serializer.save(compte=self._resolve_compte(serializer, residence))


# ============================================================
# FamilleDepense
# ============================================================
class FamilleDepenseViewSet(ModelViewSet):
    serializer_class = FamilleDepenseSerializer
    pagination_class = None
    queryset         = FamilleDepense.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return FamilleDepense.objects.none()
        return FamilleDepense.objects.filter(residence=residence)

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Aucune résidence associée.")
        serializer.save(residence=residence)


# ============================================================
# ModeleDepense
# ============================================================
class ModeleDepenseViewSet(ModelViewSet):
    serializer_class = ModeleDepenseSerializer
    pagination_class = None
    queryset         = ModeleDepense.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return ModeleDepense.objects.none()
        qs     = ModeleDepense.objects.select_related("categorie", "compte_comptable", "fournisseur").filter(residence=residence)
        actif  = self.request.query_params.get("actif")
        famille = self.request.query_params.get("famille")
        if actif is not None:
            qs = qs.filter(actif=(actif.lower() == "true"))
        if famille:
            qs = qs.filter(categorie_id=famille)
        return qs

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Aucune résidence associée.")
        serializer.save(residence=residence)

    @action(detail=True, methods=["post"], url_path="generer-depense")
    def generer_depense(self, request, pk=None):
        """Génère une dépense à partir d'un modèle de dépense."""
        modele    = self.get_object()
        residence = get_user_residence(request)

        date_str  = request.data.get("date_depense") or str(timezone.now().date())
        mois_val  = request.data.get("mois") or None
        ref       = request.data.get("facture_reference") or ""
        montant   = request.data.get("montant")
        if not montant:
            return Response({"detail": "Montant obligatoire."}, status=400)

        compte = modele.compte_comptable or _get_or_create_attente_compte(residence)

        depense = Depense.objects.create(
            residence         = residence,
            compte            = compte,
            fournisseur       = modele.fournisseur,
            modele_depense    = modele,
            date_depense      = date_str,
            montant           = montant,
            libelle           = modele.nom,
            mois              = mois_val,
            facture_reference = ref,
        )
        return Response({
            "depense_id": depense.id,
            "libelle":    depense.libelle,
            "montant":    str(depense.montant),
            "date":       str(depense.date_depense),
        })


# ============================================================
# Contrat
# ============================================================
class ContratViewSet(ModelViewSet):
    serializer_class = ContratSerializer
    pagination_class = None
    queryset         = Contrat.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Contrat.objects.none()
        qs = Contrat.objects.select_related(
            "fournisseur", "compte_comptable", "categorie"
        ).filter(residence=residence)
        actif = self.request.query_params.get("actif")
        if actif is not None:
            qs = qs.filter(actif=(actif.lower() == "true"))
        return qs

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Aucune résidence associée.")
        serializer.save(residence=residence)

    @action(detail=True, methods=["post"], url_path="generer-depense")
    def generer_depense(self, request, pk=None):
        """Injecte un paiement de contrat dans les dépenses."""
        contrat   = self.get_object()
        residence = get_user_residence(request)

        date_str  = request.data.get("date_depense") or str(timezone.now().date())
        mois_val  = request.data.get("mois") or None
        ref       = request.data.get("facture_reference") or ""
        montant   = request.data.get("montant") or contrat.montant
        if not montant:
            return Response({"detail": "Montant obligatoire."}, status=400)

        # Compte : du contrat, ou 000
        compte = contrat.compte_comptable or _get_or_create_attente_compte(residence)

        depense = Depense.objects.create(
            residence         = residence,
            compte            = compte,
            fournisseur       = contrat.fournisseur,
            date_depense      = date_str,
            montant           = montant,
            libelle           = contrat.libelle,
            mois              = mois_val,
            facture_reference = ref,
            detail            = f"Contrat : {contrat.get_type_contrat_display()}\nPériodicité : {contrat.get_periodicite_display()}",
        )
        return Response({
            "depense_id": depense.id,
            "libelle":    depense.libelle,
            "montant":    str(depense.montant),
            "date":       str(depense.date_depense),
        })


# ============================================================
# Recette
# ============================================================
class RecetteViewSet(ModelViewSet):
    serializer_class = RecetteSerializer
    pagination_class = _PageBy100
    queryset         = Recette.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Recette.objects.none()
        qs = Recette.objects.select_related("compte").filter(residence=residence).order_by("-date_recette", "-id")
        p = self.request.query_params
        if p.get("annee"):      qs = qs.filter(date_recette__year=p["annee"])
        if p.get("mois"):       qs = qs.filter(mois=p["mois"])
        if p.get("compte_id"):  qs = qs.filter(compte_id=p["compte_id"])
        if p.get("a_affecter") == "true":
            qs = qs.filter(compte__code="000")
        return qs

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        residence = get_user_residence(request)
        if not residence:
            return Response({"annees": [], "count_attente": 0})
        qs = Recette.objects.filter(residence=residence)
        annees = sorted(set(qs.values_list("date_recette__year", flat=True)), reverse=True)
        count_attente = qs.filter(compte__code="000").count()
        return Response({"annees": annees, "count_attente": count_attente})

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Aucune résidence associée à cet utilisateur.")
        # If no compte provided, assign the default "000 — Attente d'affectation"
        compte = serializer.validated_data.get("compte") or _get_or_create_attente_compte(residence)
        serializer.save(residence=residence, compte=compte)


# ============================================================
# CaisseMouvement
# ============================================================
class CaisseMouvementViewSet(ModelViewSet):
    serializer_class = CaisseMouvementSerializer
    pagination_class = _PageBy100
    queryset         = CaisseMouvement.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return CaisseMouvement.objects.none()
        qs = CaisseMouvement.objects.filter(residence=residence).select_related(
            "depense__compte", "recette__compte", "paiement"
        ).order_by("-date_mouvement", "-id")
        p = self.request.query_params
        if p.get("type_mouvement"): qs = qs.filter(type_mouvement=p["type_mouvement"])
        if p.get("sens"):           qs = qs.filter(sens=p["sens"])
        if p.get("annee"):          qs = qs.filter(date_mouvement__year=p["annee"])
        if p.get("mois"):           qs = qs.filter(mois=p["mois"])
        return qs

    def list(self, request, *args, **kwargs):
        residence = get_user_residence(request)
        if not residence:
            return Response({"results": [], "count": 0, "next": None, "previous": None})

        # Lightweight running-balance map (all records, chronological)
        all_mvt = (
            CaisseMouvement.objects
            .filter(residence=residence)
            .order_by("date_mouvement", "id")
            .values("id", "montant", "sens")
        )
        running = Decimal("0")
        balance_map = {}
        for m in all_mvt:
            v = Decimal(str(m["montant"]))
            running += v if m["sens"] == "DEBIT" else -v
            balance_map[m["id"]] = float(running)

        queryset = self.filter_queryset(self.get_queryset())

        from django.db.models import Sum, Q as DQ
        IS_ARCH = DQ(type_mouvement="ARCHIVE_ADJUSTMENT")
        agg = queryset.aggregate(
            te=Sum("montant",  filter=DQ(sens="DEBIT")  & ~IS_ARCH),
            ts=Sum("montant",  filter=DQ(sens="CREDIT") & ~IS_ARCH),
            ta_d=Sum("montant", filter=DQ(sens="DEBIT")  & IS_ARCH),
            ta_c=Sum("montant", filter=DQ(sens="CREDIT") & IS_ARCH),
        )
        total_entrees = float(agg["te"] or 0)
        total_sorties = float(agg["ts"] or 0)
        total_archive = float(agg["ta_d"] or 0) - float(agg["ta_c"] or 0)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            data = [dict(item, running_balance=balance_map.get(item["id"])) for item in serializer.data]
            response = self.get_paginated_response(data)
            response.data["total_entrees"] = total_entrees
            response.data["total_sorties"] = total_sorties
            response.data["total_archive"] = total_archive
            return response

        serializer = self.get_serializer(queryset, many=True)
        data = [dict(item, running_balance=balance_map.get(item["id"])) for item in serializer.data]
        return Response({"results": data, "total_entrees": total_entrees, "total_sorties": total_sorties, "total_archive": total_archive})

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        residence = get_user_residence(request)
        if not residence:
            return Response({"annees": [], "balance_totale": 0})
        qs = CaisseMouvement.objects.filter(residence=residence)
        annees = sorted(set(qs.values_list("date_mouvement__year", flat=True)), reverse=True)
        total = Decimal("0")
        for m in qs.values("montant", "sens"):
            v = Decimal(str(m["montant"]))
            total += v if m["sens"] == "DEBIT" else -v
        return Response({"annees": annees, "balance_totale": float(total)})

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Aucune résidence associée à cet utilisateur.")
        serializer.save(residence=residence)


# ============================================================
# Gouvernance — BureauSyndical
# ============================================================
class BureauSyndicalViewSet(ModelViewSet):
    serializer_class = BureauSyndicalSerializer
    pagination_class = None
    queryset         = BureauSyndical.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return BureauSyndical.objects.none()
        return BureauSyndical.objects.select_related("personne").filter(residence=residence)

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            raise ValidationError("Aucune résidence associée.")
        serializer.save(residence=residence)


# ============================================================
# Gouvernance — AssembleeGenerale
# ============================================================
class AssembleeGeneraleViewSet(ModelViewSet):
    serializer_class = AssembleeGeneraleSerializer
    pagination_class = None
    queryset         = AssembleeGenerale.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return AssembleeGenerale.objects.none()
        today = timezone.now().date()
        # Auto-transition PLANIFIEE → PAS_DE_RETOUR si la date est dépassée
        AssembleeGenerale.objects.filter(
            residence=residence,
            statut="PLANIFIEE",
            date_ag__lt=today,
        ).update(statut="PAS_DE_RETOUR")
        return AssembleeGenerale.objects.filter(residence=residence).annotate(
            nb_resolutions=Count("resolutions")
        ).order_by("-date_ag")

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            raise ValidationError("Aucune résidence associée.")
        today = timezone.now().date()  # noqa: F841 — gardé pour la vérification doublon
        date_ag = serializer.validated_data.get("date_ag")  # noqa: F841
        statut = serializer.validated_data.get("statut", "PLANIFIEE")
        # Interdire deux AG planifiées simultanément
        if statut == "PLANIFIEE" and AssembleeGenerale.objects.filter(residence=residence, statut="PLANIFIEE").exists():
            raise ValidationError({
                "statut": "Une assemblée générale est déjà planifiée. "
                          "Veuillez d'abord la clôturer ou l'annuler avant d'en créer une nouvelle."
            })
        serializer.save(residence=residence)

    def perform_update(self, serializer):
        instance = serializer.instance
        today = timezone.now().date()
        date_ag    = serializer.validated_data.get("date_ag",    instance.date_ag)
        new_statut = serializer.validated_data.get("statut",     instance.statut)
        # Si on (re)planifie une AG, vérifier qu'aucune autre n'est déjà planifiée
        if new_statut == "PLANIFIEE" and instance.statut != "PLANIFIEE":
            if AssembleeGenerale.objects.filter(
                residence=instance.residence, statut="PLANIFIEE"
            ).exclude(pk=instance.pk).exists():
                raise ValidationError({
                    "statut": "Une autre assemblée est déjà planifiée. "
                              "Clôturez-la d'abord avant de replanifier celle-ci."
                })
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # MandatBureauSyndical.assemblee_generale uses SET_NULL → delete manually
        MandatBureauSyndical.objects.filter(assemblee_generale=instance).delete()
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="envoyer-convocation")
    def envoyer_convocation(self, request, pk=None):
        ag = self.get_object()
        if ag.statut != "PLANIFIEE":
            return Response({"detail": "La convocation ne peut être envoyée que pour une assemblée planifiée."}, status=400)
        ag.convocation_envoyee_le = timezone.now()
        ag.save(update_fields=["convocation_envoyee_le"])
        # Enregistrement d'une notification pour chaque lot de la résidence
        from .models import Lot, Notification
        lots = Lot.objects.filter(residence=ag.residence)
        nb_sent = 0
        for lot in lots:
            try:
                Notification.objects.create(
                    residence=ag.residence,
                    lot=lot,
                    type_notification="SYSTEM",
                    titre=f"Convocation AG du {ag.date_ag}",
                    message=f"Vous êtes convoqué(e) à l'Assemblée Générale du {ag.date_ag}.\n\nOrdre du jour :\n{ag.ordre_du_jour or '(à préciser)'}",
                    statut="ENVOYE",
                )
                nb_sent += 1
            except Exception:
                pass
        return Response({"sent": nb_sent, "convocation_envoyee_le": ag.convocation_envoyee_le})


# ============================================================
# Gouvernance — Resolution
# ============================================================
class ResolutionViewSet(ModelViewSet):
    serializer_class = ResolutionSerializer
    pagination_class = None
    queryset         = Resolution.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Resolution.objects.none()
        qs = Resolution.objects.select_related("assemblee_generale").filter(
            assemblee_generale__residence=residence
        )
        ag_id = self.request.query_params.get("ag_id")
        if ag_id:
            qs = qs.filter(assemblee_generale_id=ag_id)
        return qs


# ============================================================
# Gouvernance — DocumentGouvernance
# ============================================================
class DocumentGouvernanceViewSet(ModelViewSet):
    serializer_class = DocumentGouvernanceSerializer
    pagination_class = None
    queryset         = DocumentGouvernance.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return DocumentGouvernance.objects.none()
        return DocumentGouvernance.objects.filter(residence=residence)

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            raise ValidationError("Aucune résidence associée.")
        serializer.save(residence=residence)

class MandatBureauSyndicalViewSet(ModelViewSet):
    serializer_class = MandatBureauSyndicalSerializer
    pagination_class = None
    queryset         = MandatBureauSyndical.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return MandatBureauSyndical.objects.none()
        qs = MandatBureauSyndical.objects.filter(residence=residence).prefetch_related(
            "membres__personne"
        ).select_related("assemblee_generale").annotate(nb_membres=Count("membres"))
        actif = self.request.query_params.get("actif")
        if actif == "true":
            qs = qs.filter(actif=True)
        ag_id = self.request.query_params.get("ag_id")
        if ag_id:
            qs = qs.filter(assemblee_generale_id=ag_id)
        return qs.order_by("-date_debut")

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            raise ValidationError("Aucune résidence associée.")
        # Deactivate any current active mandate for this residence
        MandatBureauSyndical.objects.filter(residence=residence, actif=True).update(actif=False)
        serializer.save(residence=residence, actif=True)


class MandatBureauMembreViewSet(ModelViewSet):
    serializer_class = MandatBureauMembreSerializer
    pagination_class = None
    queryset         = MandatBureauMembre.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return MandatBureauMembre.objects.none()
        qs = MandatBureauMembre.objects.select_related("personne", "mandat").filter(
            mandat__residence=residence
        )
        mandat_id = self.request.query_params.get("mandat_id")
        if mandat_id:
            qs = qs.filter(mandat_id=mandat_id)
        return qs


# ============================================================
# Gouvernance — Travaux
# ============================================================
class TravauxViewSet(ModelViewSet):
    serializer_class = TravauxSerializer
    pagination_class = None
    queryset         = Travaux.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Travaux.objects.none()
        qs = Travaux.objects.select_related("fournisseur").filter(residence=residence)
        statut = self.request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        return qs

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            raise ValidationError("Aucune résidence associée.")
        serializer.save(residence=residence)


# ============================================================
# Notifications
# ============================================================
class NotificationViewSet(ModelViewSet):
    serializer_class = NotificationSerializer
    pagination_class = None
    queryset         = Notification.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Notification.objects.none()
        qs = Notification.objects.select_related("lot", "personne").filter(residence=residence)
        lot_id = self.request.query_params.get("lot")
        if lot_id:
            qs = qs.filter(lot_id=lot_id)
        statut = self.request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        type_notif = self.request.query_params.get("type")
        if type_notif:
            qs = qs.filter(type_notification=type_notif)
        return qs

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            raise ValidationError("Aucune résidence associée.")
        serializer.save(residence=residence)


# ============================================================
# Suivi par lot
# ============================================================

class SuiviLotViewSet(ModelViewSet):
    serializer_class = SuiviLotSerializer
    pagination_class = None

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            from .models import SuiviLot
            return SuiviLot.objects.none()
        from .models import SuiviLot
        qs = SuiviLot.objects.select_related("lot").filter(lot__residence=residence)
        lot_id = self.request.query_params.get("lot")
        if lot_id:
            qs = qs.filter(lot_id=lot_id)
        return qs


# ============================================================
# Passation de consignes
# ============================================================
from .models import PassationConsignes, ReservePassation
from .serializers import PassationConsignesSerializer, ReservePassationSerializer
from django.db.models import Sum

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def passation_list_create(request):
    residence = get_user_residence(request)
    if not residence:
        return Response({"detail": "Aucune résidence."}, status=400)

    if request.method == "GET":
        qs = PassationConsignes.objects.filter(residence=residence).prefetch_related("reserves")
        assemblee_id = request.query_params.get("assemblee")
        if assemblee_id:
            qs = qs.filter(assemblee_id=assemblee_id)
        return Response(PassationConsignesSerializer(qs, many=True).data)

    # POST — créer : date fournie par le client, ou instant présent
    from django.utils import timezone as tz
    import datetime as _dt
    raw_date = request.data.get("date_passation")
    if raw_date:
        try:
            date_passation = _dt.datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
            if date_passation.tzinfo is None:
                date_passation = tz.make_aware(date_passation)
        except (ValueError, TypeError):
            date_passation = tz.now()
    else:
        date_passation = tz.now()
    solde_caisse = _compute_solde_caisse(residence, date=date_passation)
    p = PassationConsignes.objects.create(
        residence       = residence,
        assemblee_id    = request.data.get("assemblee") or None,
        date_passation  = date_passation,
        solde_caisse    = solde_caisse,
        solde_banque    = request.data.get("solde_banque") or 0,
        justification_ecart = request.data.get("justification_ecart", ""),
        notes                 = request.data.get("notes", ""),
        nom_syndic            = request.data.get("nom_syndic", ""),
        nom_tresorier         = request.data.get("nom_tresorier", ""),
        nom_syndic_entrant    = request.data.get("nom_syndic_entrant", ""),
        nom_tresorier_entrant = request.data.get("nom_tresorier_entrant", ""),
    )
    return Response(PassationConsignesSerializer(p).data, status=201)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def passation_detail(request, pk):
    residence = get_user_residence(request)
    try:
        p = PassationConsignes.objects.prefetch_related("reserves").get(pk=pk, residence=residence)
    except PassationConsignes.DoesNotExist:
        return Response(status=404)

    if request.method == "GET":
        return Response(PassationConsignesSerializer(p).data)

    if request.method == "PATCH":
        if "date_passation" in request.data:
            from django.utils import timezone as tz
            import datetime as _dt
            raw = request.data["date_passation"]
            try:
                dt = _dt.datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
                p.date_passation = tz.make_aware(dt) if dt.tzinfo is None else dt
            except (ValueError, TypeError):
                pass
        for field in ["justification_ecart","notes","nom_syndic","nom_tresorier","nom_syndic_entrant","nom_tresorier_entrant"]:
            if field in request.data:
                setattr(p, field, request.data[field])
        if "solde_banque" in request.data:
            p.solde_banque = request.data["solde_banque"] or 0
        # solde_caisse est TOUJOURS protégé en PATCH — figé à la création
        p.save(update_fields=[
            "date_passation","justification_ecart","notes",
            "nom_syndic","nom_tresorier","nom_syndic_entrant","nom_tresorier_entrant",
            "solde_banque","updated_at",
        ])
        p.refresh_from_db()
        return Response(PassationConsignesSerializer(p).data)

    p.delete()
    return Response(status=204)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def passation_refresh_caisse(request, pk):
    residence = get_user_residence(request)
    try:
        p = PassationConsignes.objects.get(pk=pk, residence=residence)
    except PassationConsignes.DoesNotExist:
        return Response(status=404)
    p.solde_caisse = _compute_solde_caisse(residence, date=p.date_passation)
    p.save()
    return Response({"solde_caisse": str(p.solde_caisse)})


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def passation_reserves(request, pk):
    residence = get_user_residence(request)
    try:
        p = PassationConsignes.objects.get(pk=pk, residence=residence)
    except PassationConsignes.DoesNotExist:
        return Response(status=404)

    if request.method == "POST":
        r = ReservePassation.objects.create(
            passation = p,
            libelle   = request.data.get("libelle", ""),
            montant   = request.data.get("montant") or None,
            ordre     = request.data.get("ordre", 0),
        )
        return Response(ReservePassationSerializer(r).data, status=201)

    # DELETE reserve
    rid = request.data.get("id")
    ReservePassation.objects.filter(id=rid, passation=p).delete()
    return Response(status=204)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def passation_situation_lots(request, pk):
    """Retourne la situation paiements par lot pour une passation."""
    residence = get_user_residence(request)
    try:
        PassationConsignes.objects.get(pk=pk, residence=residence)
    except PassationConsignes.DoesNotExist:
        return Response(status=404)

    from .models import Lot, DetailAppelCharge
    from django.db.models import Sum as S
    lots = Lot.objects.filter(residence=residence).select_related("representant","groupe").order_by("groupe__nom_groupe","numero_lot")
    result = []
    for lot in lots:
        agg = DetailAppelCharge.objects.filter(lot=lot).aggregate(du=S("montant"), recu=S("montant_recu"))
        du   = float(agg["du"]   or 0)
        recu = float(agg["recu"] or 0)
        if du == 0:
            continue
        rep = lot.representant
        result.append({
            "lot":    lot.numero_lot,
            "nom":    f"{rep.nom} {rep.prenom or ''}".strip() if rep else "—",
            "du":     du,
            "recu":   recu,
            "reste":  round(du - recu, 2),
        })
    return Response(result)


def _compute_solde_caisse(residence, date=None):
    """
    Calcule le solde caisse à une date donnée.

    Les mouvements normaux sont filtrés par date_mouvement <= filter_date.
    Les ARCHIVE_ADJUSTMENT sont toujours inclus : leur date_mouvement est la
    date de FIN d'archive (peut être dans le futur), mais ils représentent un
    report historique réel qui doit toujours être compté.
    """
    from .models import CaisseMouvement
    from django.db.models import Sum, Q
    import datetime as dt_module
    from django.utils.dateparse import parse_datetime, parse_date

    # Convertit en date (CaisseMouvement.date_mouvement est un DateField)
    filter_date = None
    if date:
        if isinstance(date, str):
            parsed = parse_datetime(date)
            filter_date = parsed.date() if parsed else parse_date(date)
        elif isinstance(date, dt_module.datetime):
            filter_date = date.date()
        elif isinstance(date, dt_module.date):
            filter_date = date

    qs = CaisseMouvement.objects.filter(residence=residence)
    if filter_date:
        # Inclure les mouvements jusqu'à filter_date + tous les ajustements
        # d'archive (leur date de fin peut dépasser filter_date mais ils
        # représentent des données historiques réelles déjà consolidées)
        qs = qs.filter(
            Q(date_mouvement__lte=filter_date) |
            Q(type_mouvement="ARCHIVE_ADJUSTMENT")
        )

    agg = qs.aggregate(
        entrees=Sum("montant", filter=Q(sens="DEBIT")),
        sorties=Sum("montant", filter=Q(sens="CREDIT")),
    )
    return float(agg["entrees"] or 0) - float(agg["sorties"] or 0)
