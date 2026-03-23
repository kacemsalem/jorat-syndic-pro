from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, Sum
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

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
class DepenseViewSet(ModelViewSet):
    serializer_class = DepenseSerializer
    pagination_class = None
    queryset         = Depense.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Depense.objects.none()
        qs             = Depense.objects.select_related("compte", "categorie", "fournisseur").filter(residence=residence)
        compte_id      = self.request.query_params.get("compte")
        categorie_id   = self.request.query_params.get("categorie")
        fournisseur_id = self.request.query_params.get("fournisseur")
        famille        = self.request.query_params.get("famille")
        annee          = self.request.query_params.get("annee")
        a_affecter     = self.request.query_params.get("a_affecter")
        if compte_id:
            qs = qs.filter(compte_id=compte_id)
        if categorie_id:
            qs = qs.filter(categorie_id=categorie_id)
        if fournisseur_id:
            qs = qs.filter(fournisseur_id=fournisseur_id)
        if famille:
            qs = qs.filter(categorie__famille=famille)
        if annee:
            qs = qs.filter(date_depense__year=annee)
        if a_affecter == "true":
            qs = qs.filter(compte__code="000")
        return qs

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
        qs     = ModeleDepense.objects.select_related("famille_depense", "compte_comptable", "fournisseur").filter(residence=residence)
        actif  = self.request.query_params.get("actif")
        famille = self.request.query_params.get("famille")
        if actif is not None:
            qs = qs.filter(actif=(actif.lower() == "true"))
        if famille:
            qs = qs.filter(famille_depense_id=famille)
        return qs

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Aucune résidence associée.")
        serializer.save(residence=residence)


# ============================================================
# Recette
# ============================================================
class RecetteViewSet(ModelViewSet):
    serializer_class = RecetteSerializer
    pagination_class = None
    queryset         = Recette.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return Recette.objects.none()
        qs         = Recette.objects.select_related("compte").filter(residence=residence)
        annee      = self.request.query_params.get("annee")
        compte_id  = self.request.query_params.get("compte_id")
        a_affecter = self.request.query_params.get("a_affecter")
        if annee:
            qs = qs.filter(date_recette__year=annee)
        if compte_id:
            qs = qs.filter(compte_id=compte_id)
        if a_affecter == "true":
            qs = qs.filter(compte__code="000")
        return qs

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
    pagination_class = None
    queryset         = CaisseMouvement.objects.all()

    def get_queryset(self):
        residence = get_user_residence(self.request)
        if not residence:
            return CaisseMouvement.objects.none()
        qs      = CaisseMouvement.objects.filter(residence=residence).select_related(
            "depense__compte", "recette__compte", "paiement"
        )
        type_mv = self.request.query_params.get("type_mouvement")
        sens    = self.request.query_params.get("sens")
        annee   = self.request.query_params.get("annee")
        mois    = self.request.query_params.get("mois")
        if type_mv:
            qs = qs.filter(type_mouvement=type_mv)
        if sens:
            qs = qs.filter(sens=sens)
        if annee:
            qs = qs.filter(date_mouvement__year=annee)
        if mois:
            qs = qs.filter(date_mouvement__month=mois)
        return qs

    def list(self, request, *args, **kwargs):
        residence = get_user_residence(request)
        if not residence:
            return Response([])

        # Compute running balance in strict chronological order (date asc, id asc)
        # Uses .values() for a lightweight query — no model instantiation needed.
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

        # Serialize the filtered queryset (filters applied via get_queryset)
        queryset   = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = [
            dict(item, running_balance=balance_map.get(item["id"]))
            for item in serializer.data
        ]
        return Response(data)

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
        return AssembleeGenerale.objects.filter(residence=residence).annotate(
            nb_resolutions=Count("resolutions")
        )

    def perform_create(self, serializer):
        residence = get_user_residence(self.request)
        if not residence:
            raise ValidationError("Aucune résidence associée.")
        serializer.save(residence=residence)


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

    # POST — créer
    date_passation = request.data.get("date_passation") or None
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
        for field in ["date_passation","justification_ecart","notes","nom_syndic","nom_tresorier","nom_syndic_entrant","nom_tresorier_entrant"]:
            if field in request.data:
                setattr(p, field, request.data[field])
        if "solde_banque" in request.data:
            p.solde_banque = request.data["solde_banque"] or 0
        p.save()
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
    from .models import CaisseMouvement
    from django.db.models import Sum, Q
    qs = CaisseMouvement.objects.filter(residence=residence)
    if date:
        qs = qs.filter(date_mouvement__lte=date)
    agg = qs.aggregate(
        entrees=Sum("montant", filter=Q(sens="DEBIT")),
        sorties=Sum("montant", filter=Q(sens="CREDIT")),
    )
    return float(agg["entrees"] or 0) - float(agg["sorties"] or 0)
