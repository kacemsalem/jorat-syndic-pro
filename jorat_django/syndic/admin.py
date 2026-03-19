from django.contrib import admin
from .models import (
    Residence,
    Lot,
    # ResidenceUser,
    Groupe,
    Personne,
    AppelCharge,
    DetailAppelCharge,
    Paiement,
    AffectationPaiement,
    ResidenceMembership,
    CategorieDepense,
    Fournisseur,
    CompteComptable,
    Depense,
    CaisseMouvement,
    Recette,
)


# ============================================================
# Résidence
# ============================================================
@admin.register(Residence)
class ResidenceAdmin(admin.ModelAdmin):
    list_display = ("nom_residence", "ville_residence", "created_at")
    search_fields = ("nom_residence", "ville_residence")


# ============================================================
# Lot
# ============================================================
@admin.register(Lot)
class LotAdmin(admin.ModelAdmin):
    list_display = ("numero_lot", "residence", "statut_lot", "surface_lot", "type_lot")
    list_filter = ("residence", "type_lot")
    search_fields = ("numero_lot",)


# ============================================================
# Relation User ↔ Résidence
# ============================================================
# @admin.register(ResidenceUser)
# class ResidenceUserAdmin(admin.ModelAdmin):
#     list_display = ("user", "residence", "role", "is_active")
#     list_filter = ("role", "residence")


# ============================================================
# Groupe
# ============================================================
@admin.register(Groupe)
class GroupeAdmin(admin.ModelAdmin):
    list_display = ("nom_groupe", "description")


# ============================================================
# Personne
# ============================================================
@admin.register(Personne)
class PersonneAdmin(admin.ModelAdmin):
    list_display = ("nom", "prenom", "cin", "telephone", "email")
    search_fields = ("nom", "prenom", "cin")


# ============================================================
# Inline détail appel (dans AppelCharge)
# ============================================================
class DetailAppelInline(admin.TabularInline):
    model = DetailAppelCharge
    extra = 1

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "lot":
            # récupérer l'appel en cours d'édition
            object_id = request.resolver_match.kwargs.get("object_id")

            if object_id:
                try:
                    appel = AppelCharge.objects.get(pk=object_id)
                    kwargs["queryset"] = Lot.objects.filter(
                        residence=appel.residence
                    )
                except AppelCharge.DoesNotExist:
                    pass

        return super().formfield_for_foreignkey(db_field, request, **kwargs)


# ============================================================
# Appel de Charge (entête)
# ============================================================
@admin.register(AppelCharge)
class AppelChargeAdmin(admin.ModelAdmin):
    list_display = (
        "code_fond",
        "nom_fond",
        "residence",
        "type_charge",
        "exercice",
        "periode",
        "date_emission",
    )
    list_filter = ("residence", "type_charge", "exercice")
    search_fields = ("periode",)
    inlines = [DetailAppelInline]


# ============================================================
# Détail Appel Charge (vue directe si besoin)
# ============================================================
@admin.register(DetailAppelCharge)
class DetailAppelChargeAdmin(admin.ModelAdmin):
    list_display = ("appel", "lot", "montant", "statut")
    list_filter = ("appel", "statut")

# ============================================================
# Affectation Paiement (inline dans Paiement)
# ============================================================
class AffectationInline(admin.TabularInline):
    model = AffectationPaiement
    extra = 1

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "detail":
            obj_id = request.resolver_match.kwargs.get("object_id")

            if obj_id:
                paiement = Paiement.objects.get(pk=obj_id)

                kwargs["queryset"] = DetailAppelCharge.objects.filter(
                    appel__residence=paiement.residence,
                    lot=paiement.lot
                ).order_by("appel__periode")

        return super().formfield_for_foreignkey(db_field, request, **kwargs)

# ============================================================
# Paiement
# ============================================================

@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = (
        "lot",
        "residence",
        "date_paiement",
        "montant",
        "reference",
    )
    list_filter = (
        "residence",
        "date_paiement",
    )
    search_fields = (
        "reference",
        "lot__numero_lot",
    )
    inlines = [AffectationInline]


# ============================================================
# Affectation Paiement (vue directe si besoin)
# ============================================================

@admin.register(AffectationPaiement)
class AffectationPaiementAdmin(admin.ModelAdmin):
    list_display = (
        "paiement",
        "detail",
        "montant_affecte",
    )
    search_fields = (
        "paiement__reference",
        "appel_charge__periode",
    )
#-----------------------------------------------------------------
@admin.register(ResidenceMembership)
class ResidenceMembershipAdmin(admin.ModelAdmin):
    list_display = ["user", "residence", "role", "actif"]


# ============================================================
# Dépenses
# ============================================================
@admin.register(CategorieDepense)
class CategorieDepenseAdmin(admin.ModelAdmin):
    list_display  = ("nom", "famille", "type_depense", "nature", "actif", "residence")
    list_filter   = ("residence", "famille", "type_depense", "nature", "actif")
    search_fields = ("nom",)


@admin.register(Fournisseur)
class FournisseurAdmin(admin.ModelAdmin):
    list_display  = ("nom", "telephone", "email", "actif", "residence")
    list_filter   = ("residence", "actif")
    search_fields = ("nom", "email")


@admin.register(CompteComptable)
class CompteComptableAdmin(admin.ModelAdmin):
    list_display  = ("code", "libelle", "actif", "residence")
    list_filter   = ("residence", "actif")
    search_fields = ("code", "libelle")


@admin.register(Depense)
class DepenseAdmin(admin.ModelAdmin):
    list_display  = ("date_depense", "libelle", "montant", "compte", "categorie", "fournisseur", "residence")
    list_filter   = ("residence", "compte", "categorie__famille", "date_depense")
    search_fields = ("libelle", "facture_reference")


# ============================================================
# Caisse
# ============================================================
@admin.register(CaisseMouvement)
class CaisseMouvementAdmin(admin.ModelAdmin):
    list_display  = ("date_mouvement", "type_mouvement", "sens", "montant", "libelle", "residence")
    list_filter   = ("residence", "type_mouvement", "sens", "date_mouvement")
    search_fields = ("libelle",)


# ============================================================
# Recette
# ============================================================
@admin.register(Recette)
class RecetteAdmin(admin.ModelAdmin):
    list_display  = ("date_recette", "libelle", "montant", "compte", "residence")
    list_filter   = ("residence", "compte", "date_recette")
    search_fields = ("libelle", "source")