from rest_framework import serializers

from .models import (
    Residence,
    Groupe,
    Lot,
    Personne,
    Paiement,
    AppelCharge,
    DetailAppelCharge,
    AffectationPaiement,
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


# -------------------------------------------------
# Residence
# -------------------------------------------------
class ResidenceSerializer(serializers.ModelSerializer):
    nombre_lots = serializers.IntegerField(read_only=True)

    class Meta:
        model = Residence
        fields = "__all__"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Always return a relative /media/... URL so it works through the Vite proxy
        # regardless of the host DRF would embed in the absolute URL
        if instance.logo and instance.logo.name:
            data["logo"] = instance.logo.url   # e.g. /media/residences/logos/file.png
        else:
            data["logo"] = None
        return data


# -------------------------------------------------
# Groupe
# -------------------------------------------------
class GroupeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Groupe
        fields = "__all__"


# -------------------------------------------------
# Personne (Mini → pour listes / selects)
# -------------------------------------------------
class PersonneMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personne
        fields = ["id", "nom", "prenom", "telephone", "email"]


# -------------------------------------------------
# Personne (Full → pour création / édition)
# -------------------------------------------------
class PersonneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personne
        fields = [
            "id",
            "nom",
            "prenom",
            "cin",
            "telephone",
            "email",
            "type_personne",
            "residence",
        ]

    def validate_cin(self, value):
        # Convert empty string to None so the unique constraint allows multiple blank CINs
        return value or None


# -------------------------------------------------
# Lot
# -------------------------------------------------
class LotSerializer(serializers.ModelSerializer):
    proprietaire  = PersonneMiniSerializer(read_only=True)
    occupant      = PersonneMiniSerializer(read_only=True)
    representant  = PersonneMiniSerializer(read_only=True)

    proprietaire_id = serializers.PrimaryKeyRelatedField(
        queryset=Personne.objects.all(),
        source="proprietaire",
        write_only=True,
        allow_null=True,
        required=False,
    )
    occupant_id = serializers.PrimaryKeyRelatedField(
        queryset=Personne.objects.all(),
        source="occupant",
        write_only=True,
        allow_null=True,
        required=False,
    )
    representant_id = serializers.PrimaryKeyRelatedField(
        queryset=Personne.objects.all(),
        source="representant",
        write_only=True,
        allow_null=True,
        required=False,
    )

    total_du   = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, default=0)
    total_recu = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, default=0)

    class Meta:
        model = Lot
        fields = "__all__"


# -------------------------------------------------
# Paiement
# -------------------------------------------------
class PaiementSerializer(serializers.ModelSerializer):
    montant_affecte     = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    montant_non_affecte = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Paiement
        fields = "__all__"
        extra_kwargs = {"residence": {"required": False}}

    def validate(self, attrs):
        lot = attrs.get("lot")
        if lot:
            attrs["residence"] = lot.residence
        return attrs


# -------------------------------------------------
# AffectationPaiement
# -------------------------------------------------
class AffectationPaiementSerializer(serializers.ModelSerializer):
    detail_code = serializers.CharField(source="detail.appel.code_fond", read_only=True)
    lot_numero  = serializers.CharField(source="detail.lot.numero_lot",  read_only=True)

    class Meta:
        model  = AffectationPaiement
        fields = "__all__"


# -------------------------------------------------
# AppelCharge
# -------------------------------------------------
class AppelChargeSerializer(serializers.ModelSerializer):
    periode_label     = serializers.SerializerMethodField()
    type_charge_label = serializers.SerializerMethodField()
    nombre_details    = serializers.IntegerField(read_only=True)
    montant_total     = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, default=0)

    class Meta:
        model = AppelCharge
        fields = "__all__"
        extra_kwargs = {
            "code_fond": {"read_only": True},  # always auto-generated
            "residence": {"read_only": True},  # injected server-side via perform_create
        }

    def get_periode_label(self, obj):
        return dict(AppelCharge.PERIODE_CHOICES).get(obj.periode, obj.periode)

    def get_type_charge_label(self, obj):
        return dict(AppelCharge.TYPE_CHARGE_CHOICES).get(obj.type_charge, obj.type_charge)


# -------------------------------------------------
# DetailAppelCharge
# -------------------------------------------------
  # ============================================================
# DetailAppelChargeSerializer — version montant_recu
# Remplacer la classe dans serializers.py
# ============================================================

class DetailAppelChargeSerializer(serializers.ModelSerializer):
    lot_numero        = serializers.CharField(source="lot.numero_lot",             read_only=True)
    lot_groupe_nom    = serializers.CharField(source="lot.groupe.nom_groupe",      read_only=True, default="")
    contact_nom       = serializers.CharField(source="lot.representant.nom",       read_only=True)
    contact_prenom    = serializers.CharField(source="lot.representant.prenom",    read_only=True)
    contact_telephone = serializers.CharField(source="lot.representant.telephone", read_only=True)
    contact_email     = serializers.CharField(source="lot.representant.email",     read_only=True)
    statut_label      = serializers.SerializerMethodField()
    appel_code        = serializers.CharField(source="appel.code_fond",   read_only=True)
    appel_exercice    = serializers.IntegerField(source="appel.exercice", read_only=True)
    appel_periode     = serializers.CharField(source="appel.periode",     read_only=True)
    appel_type_charge = serializers.CharField(source="appel.type_charge", read_only=True)

    class Meta:
        model  = DetailAppelCharge
        fields = "__all__"
        extra_kwargs = {
            "statut":       {"required": False},
            "montant_recu": {"required": False},
            "justificatif": {"required": False},
        }

    def get_statut_label(self, obj):
        return dict(DetailAppelCharge.STATUT_CHOICES).get(obj.statut, obj.statut)

    def validate(self, attrs):
        return attrs


# -------------------------------------------------
# CategorieDepense
# -------------------------------------------------
class CategorieDepenseSerializer(serializers.ModelSerializer):
    famille_label         = serializers.SerializerMethodField()
    type_depense_label    = serializers.SerializerMethodField()
    nature_label          = serializers.SerializerMethodField()
    compte_defaut_code    = serializers.CharField(source="compte_defaut.code",    read_only=True, allow_null=True)
    compte_defaut_libelle = serializers.CharField(source="compte_defaut.libelle", read_only=True, allow_null=True)

    class Meta:
        model  = CategorieDepense
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}

    def get_famille_label(self, obj):
        return dict(CategorieDepense.FAMILLE_CHOICES).get(obj.famille, obj.famille)

    def get_type_depense_label(self, obj):
        return dict(CategorieDepense.TYPE_DEPENSE_CHOICES).get(obj.type_depense, obj.type_depense)

    def get_nature_label(self, obj):
        return dict(CategorieDepense.NATURE_CHOICES).get(obj.nature, obj.nature)


# -------------------------------------------------
# Fournisseur
# -------------------------------------------------
class FournisseurSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model  = Fournisseur
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}

    def get_nom_complet(self, obj):
        contact = " ".join(p for p in [obj.genre, obj.nom, obj.prenom] if p)
        if obj.nom_societe and contact:
            return f"{obj.nom_societe} — {contact}"
        return obj.nom_societe or contact or obj.nom


# -------------------------------------------------
# CompteComptable
# -------------------------------------------------
class CompteComptableSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CompteComptable
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}


# -------------------------------------------------
# FamilleDepense
# -------------------------------------------------
class FamilleDepenseSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FamilleDepense
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}


# -------------------------------------------------
# ModeleDepense
# -------------------------------------------------
class ModeleDepenseSerializer(serializers.ModelSerializer):
    famille_nom      = serializers.CharField(source="famille_depense.nom", read_only=True)
    compte_code      = serializers.CharField(source="compte_comptable.code",    read_only=True, allow_null=True)
    compte_libelle   = serializers.CharField(source="compte_comptable.libelle", read_only=True, allow_null=True)
    fournisseur_nom  = serializers.SerializerMethodField()

    class Meta:
        model  = ModeleDepense
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}

    def get_fournisseur_nom(self, obj):
        if not obj.fournisseur:
            return None
        f = obj.fournisseur
        return f.nom_societe or f"{f.nom} {f.prenom}".strip() or f.nom


# -------------------------------------------------
# Depense
# -------------------------------------------------
class DepenseSerializer(serializers.ModelSerializer):
    compte_code        = serializers.CharField(source="compte.code",    read_only=True)
    compte_libelle     = serializers.CharField(source="compte.libelle", read_only=True)
    modele_nom         = serializers.CharField(source="modele_depense.nom",                      read_only=True, allow_null=True)
    modele_famille_nom = serializers.CharField(source="modele_depense.famille_depense.nom",      read_only=True, allow_null=True)
    categorie_nom      = serializers.CharField(source="categorie.nom",    read_only=True, allow_null=True)
    categorie_famille  = serializers.CharField(source="categorie.famille", read_only=True, allow_null=True)
    fournisseur_nom    = serializers.SerializerMethodField()

    class Meta:
        model  = Depense
        fields = "__all__"
        extra_kwargs = {
            "residence": {"read_only": True},
            "compte":    {"required": False, "allow_null": True},
        }

    def get_fournisseur_nom(self, obj):
        if not obj.fournisseur:
            return None
        f = obj.fournisseur
        contact = " ".join(p for p in [f.genre, f.nom, f.prenom] if p)
        if f.nom_societe and contact:
            return f"{f.nom_societe} — {contact}"
        return f.nom_societe or contact or f.nom


# -------------------------------------------------
# Recette
# -------------------------------------------------
class RecetteSerializer(serializers.ModelSerializer):
    compte_code    = serializers.CharField(source="compte.code",    read_only=True)
    compte_libelle = serializers.CharField(source="compte.libelle", read_only=True)

    class Meta:
        model  = Recette
        fields = "__all__"
        extra_kwargs = {
            "residence": {"read_only": True},
            "compte":    {"required": False, "allow_null": True},
        }


# -------------------------------------------------
# CaisseMouvement
# -------------------------------------------------
class CaisseMouvementSerializer(serializers.ModelSerializer):
    type_mouvement_label = serializers.CharField(source="get_type_mouvement_display", read_only=True)
    sens_label           = serializers.CharField(source="get_sens_display",           read_only=True)
    mois                 = serializers.SerializerMethodField()
    compte_code          = serializers.SerializerMethodField()
    compte_libelle       = serializers.SerializerMethodField()

    def get_mois(self, obj):
        if obj.paiement_id:
            return obj.paiement.mois
        if obj.depense_id:
            return obj.depense.mois
        if obj.recette_id:
            return obj.recette.mois
        return None

    def get_compte_code(self, obj):
        if obj.depense_id and obj.depense.compte_id:
            return obj.depense.compte.code
        if obj.recette_id and obj.recette.compte_id:
            return obj.recette.compte.code
        if obj.paiement_id:
            return "342000"
        return "512000"

    def get_compte_libelle(self, obj):
        if obj.depense_id and obj.depense.compte_id:
            return obj.depense.compte.libelle
        if obj.recette_id and obj.recette.compte_id:
            return obj.recette.compte.libelle
        if obj.paiement_id:
            return "Copropriétaires"
        return "Trésorerie"

    class Meta:
        model  = CaisseMouvement
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}


# -------------------------------------------------
# Gouvernance
# -------------------------------------------------
class BureauSyndicalSerializer(serializers.ModelSerializer):
    personne_nom    = serializers.CharField(source="personne.nom",    read_only=True)
    personne_prenom = serializers.CharField(source="personne.prenom", read_only=True)
    fonction_label  = serializers.CharField(source="get_fonction_display", read_only=True)

    class Meta:
        model  = BureauSyndical
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}


class AssembleeGeneraleSerializer(serializers.ModelSerializer):
    type_ag_label  = serializers.CharField(source="get_type_ag_display",  read_only=True)
    statut_label   = serializers.CharField(source="get_statut_display",   read_only=True)
    nb_resolutions = serializers.IntegerField(read_only=True)

    class Meta:
        model  = AssembleeGenerale
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}


class ResolutionSerializer(serializers.ModelSerializer):
    resultat_label = serializers.CharField(source="get_resultat_display", read_only=True)
    ag_date        = serializers.DateField(source="assemblee_generale.date_ag", read_only=True)
    ag_type        = serializers.CharField(source="assemblee_generale.get_type_ag_display", read_only=True)

    class Meta:
        model  = Resolution
        fields = "__all__"


class DocumentGouvernanceSerializer(serializers.ModelSerializer):
    type_document_label = serializers.CharField(source="get_type_document_display", read_only=True)

    class Meta:
        model  = DocumentGouvernance
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}


class MandatBureauMembreSerializer(serializers.ModelSerializer):
    personne_nom    = serializers.CharField(source="personne.nom",             read_only=True)
    personne_prenom = serializers.CharField(source="personne.prenom",          read_only=True)
    fonction_label  = serializers.CharField(source="get_fonction_display",     read_only=True)

    class Meta:
        model  = MandatBureauMembre
        fields = "__all__"


class MandatBureauSyndicalSerializer(serializers.ModelSerializer):
    membres    = MandatBureauMembreSerializer(many=True, read_only=True)
    nb_membres = serializers.IntegerField(read_only=True)
    ag_date    = serializers.DateField(source="assemblee_generale.date_ag",              read_only=True, allow_null=True)
    ag_type    = serializers.CharField(source="assemblee_generale.get_type_ag_display",  read_only=True, allow_null=True)

    class Meta:
        model  = MandatBureauSyndical
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}


# -------------------------------------------------
# Travaux
# -------------------------------------------------
class TravauxSerializer(serializers.ModelSerializer):
    statut_label      = serializers.CharField(source="get_statut_display", read_only=True)
    fournisseur_nom   = serializers.SerializerMethodField()

    class Meta:
        model  = Travaux
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}

    def get_fournisseur_nom(self, obj):
        if not obj.fournisseur:
            return None
        f = obj.fournisseur
        return f.nom_societe or f"{f.nom} {f.prenom}".strip() or f.nom


# -------------------------------------------------
# Notification
# -------------------------------------------------
class NotificationSerializer(serializers.ModelSerializer):
    type_label   = serializers.CharField(source="get_type_notification_display", read_only=True)
    statut_label = serializers.CharField(source="get_statut_display", read_only=True)
    lot_numero   = serializers.SerializerMethodField()
    personne_nom = serializers.SerializerMethodField()

    class Meta:
        model  = Notification
        fields = "__all__"
        extra_kwargs = {"residence": {"read_only": True}}

    def get_lot_numero(self, obj):
        return obj.lot.numero_lot if obj.lot else None

    def get_personne_nom(self, obj):
        if not obj.personne:
            return None
        return f"{obj.personne.prenom} {obj.personne.nom}".strip()
