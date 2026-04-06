from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Q
from decimal import Decimal

User = get_user_model()

MOIS_CHOICES = [
    ("JAN", "Janvier"), ("FEV", "Février"),  ("MAR", "Mars"),
    ("AVR", "Avril"),   ("MAI", "Mai"),       ("JUN", "Juin"),
    ("JUL", "Juillet"), ("AOU", "Août"),      ("SEP", "Septembre"),
    ("OCT", "Octobre"), ("NOV", "Novembre"),  ("DEC", "Décembre"),
]


# ==========================================================
# 1️⃣  Modèle abstrait pour audit automatique
# ==========================================================A
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ==========================================================
# 2️⃣  Modèle Residence
# ==========================================================
class Residence(TimeStampedModel):

    CLASSIFICATION_CHOICES = [
        ("PETITE", "Petite"),
        ("MOYENNE", "Moyenne"),
        ("GRANDE", "Grande"),
    ]

    STATUT_CHOICES = [
        ("ACTIF", "Actif"),
        ("INACTIF", "Inactif"),
    ]

    MODE_APPEL_CHOICES = [
        ("MENSUEL", "Mensuel"),
        ("ANNUEL", "Annuel"),
    ]

    MODE_REPARTITION_CHOICES = [
        ("PART_EGALE", "Part égale"),
        ("MANUEL",     "Montant manuel"),
        ("TANTIEME",   "Tantième (‰)"),
    ]

    nom_residence = models.CharField(max_length=150)
    ville_residence = models.CharField(max_length=100)

    adresse_residence = models.CharField(max_length=255, blank=True, null=True)

    mode_appel_charge = models.CharField(
        max_length=10,
        choices=MODE_APPEL_CHOICES,
        default="MENSUEL"
    )

    code_postal_residence = models.CharField(max_length=20, blank=True, null=True)

    classification = models.CharField(
        max_length=10,
        choices=CLASSIFICATION_CHOICES,
        default="PETITE",
    )

    statut_residence = models.CharField(
        max_length=10,
        choices=STATUT_CHOICES,
        default="ACTIF",
    )

    description = models.TextField(blank=True, null=True)

    logo = models.ImageField(upload_to="residences/logos/", blank=True, null=True)
    logo_base64 = models.TextField(blank=True, null=True)

    email = models.EmailField(blank=True, null=True)
    email_password = models.CharField(max_length=255, blank=True, null=True,
        help_text="Mot de passe d'application SMTP pour l'envoi d'emails")

    partage_rapport_resident = models.BooleanField(
        default=False,
        help_text="Partager le rapport financier avec les résidents"
    )

    mode_repartition = models.CharField(
        max_length=12,
        choices=MODE_REPARTITION_CHOICES,
        default="PART_EGALE",
        help_text="Méthode de répartition des charges entre les lots",
    )

    class Meta:
        unique_together = ("nom_residence", "ville_residence")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.nom_residence} ({self.ville_residence})"


# ============================================================
# Groupe
# ============================================================
class Groupe(TimeStampedModel):
    """
    Groupe de lots résidence: Bâtiment A, Bloc C, Zone 1, Tour 2, etc.
    """
    residence = models.ForeignKey(
        "Residence",
        on_delete=models.CASCADE,
        related_name="groupes",
    )

    nom_groupe = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["residence", "nom_groupe"],
                name="uniq_groupe_nom_par_residence",
            )
        ]
        ordering = ["residence", "nom_groupe"]

    def __str__(self):
        return f"{self.nom_groupe} - {self.residence.nom_residence}"


# ============================================================
# Lot
# ============================================================
class Lot(TimeStampedModel):
    """
    Lot (appartement, local, bureau...) rattaché à une résidence.
    """

    STATUT_CHOICES = [
        ("A_JOUR", "A jour"),
        ("EN_RETARD", "En retard"),
        ("REFUS", "Refus"),
    ]

    TYPE_CHOICES = [
        ("APPARTEMENT", "Appartement"),
        ("VILLA", "Villa"),
        ("MAISON", "Maison"),
        ("LOCAL", "Local"),
        ("COMMERCE", "Commerce"),
        ("BUREAU", "Bureau"),
        ("AUTRE", "Autre"),
    ]

    residence = models.ForeignKey(
        "Residence",
        on_delete=models.CASCADE,
        related_name="lots",
    )

    proprietaire = models.ForeignKey(
        "Personne",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="lots_proprietaire"
    )

    montant_ref = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    occupant = models.ForeignKey(
        "Personne",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lots_occupant"
    )

    representant = models.ForeignKey(
        "Personne",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lots_representant"
    )

    groupe = models.ForeignKey(
        "Groupe",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lots",
    )

    numero_lot = models.CharField(max_length=50)

    surface_lot = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )

    etage_lot = models.CharField(max_length=50, blank=True)

    type_lot = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default="APPARTEMENT",
    )

    tantiemes = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Quote-part en millièmes (ex : 85.50 pour 85.50/1000)",
    )

    remarque_lot = models.TextField(blank=True)

    statut_lot = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default="A_JOUR",
        db_index=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["residence", "numero_lot"],
                name="uniq_lot_numero_par_residence",
            ),
        ]
        ordering = ["residence", "numero_lot"]

    def clean(self):
        super().clean()
        # ✅ Un lot ne peut pas référencer un groupe d'une autre résidence
        if self.groupe and self.groupe.residence_id != self.residence_id:
            raise ValidationError({"groupe": "Ce groupe n'appartient pas à la même résidence."})

    def __str__(self):
        return f"{self.numero_lot} - {self.residence.nom_residence}"


# ============================================================
# ResidenceUser (⚠️ à déprécier si ResidenceMembership est utilisé)
# ============================================================
# class ResidenceUser(models.Model):
#     """
#     ⚠️ NOTE :
#     Tu as aussi ResidenceMembership qui fait quasiment la même chose.
#     Pour ne pas perturber l'app, on conserve ce modèle tel quel.
#     Plus tard : garder un seul des deux.
#     """

#     class Role(models.TextChoices):
#         ADMIN = "ADMIN", "Admin résidence"
#         USER = "USER", "Utilisateur"

#     user = models.ForeignKey(
#         User,
#         on_delete=models.CASCADE,
#         related_name="residences_memberships"
#     )

#     residence = models.ForeignKey(
#         Residence,
#         on_delete=models.CASCADE,
#         related_name="users_memberships"
#     )

#     role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)
#     is_active = models.BooleanField(default=True)
#     created_at = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         constraints = [
#             models.UniqueConstraint(
#                 fields=["user", "residence"],
#                 name="uniq_user_par_residence"
#             )
#         ]

#     def __str__(self):
#         return f"{self.user} -> {self.residence.nom_residence} ({self.role})"


# ==========================================================
# ResidenceMembership (⚠️ doublon fonctionnel avec ResidenceUser)
# ==========================================================
class ResidenceMembership(models.Model):
    ROLE_CHOICES = [
        ("SUPER_ADMIN", "Super Admin"),
        ("ADMIN", "Admin"),
        ("GESTIONNAIRE", "Gestionnaire"),
        ("COMPTABLE", "Comptable"),
        ("LECTURE", "Lecture seule"),
        ("RESIDENT", "Résident"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="residence_memberships"
    )

    residence = models.ForeignKey(
        "Residence",
        on_delete=models.CASCADE,
        related_name="memberships"
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    actif = models.BooleanField(default=True)

    lot = models.ForeignKey(
        "Lot",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resident_memberships",
    )

    must_change_password = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "residence")
        ordering = ["residence", "user"]

    def __str__(self):
        return f"{self.user} - {self.residence} ({self.role})"


# ============================================================
# Personne
# ============================================================
class Personne(models.Model):

    TYPE_CHOICES = [
        ("PHYSIQUE", "Personne physique"),
        ("MORALE", "Personne morale"),
    ]

    residence = models.ForeignKey(
        Residence,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="personnes"
    )

    nom = models.CharField(max_length=150)
    prenom = models.CharField(max_length=150, blank=True)
    cin = models.CharField(max_length=20, unique=True, null=True, blank=True)

    telephone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    type_personne = models.CharField(max_length=20, choices=TYPE_CHOICES, default="PHYSIQUE")

    def __str__(self):
        return f"{self.nom} {self.prenom}"


# ============================================================
# PAIEMENT
# ============================================================
class Paiement(TimeStampedModel):
    """
    Un paiement est un encaissement sur un lot.
    Il sera réparti via AffectationPaiement sur une ou plusieurs dettes (DetailAppelCharge).
    """

    residence = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="paiements")
    lot = models.ForeignKey("Lot", on_delete=models.CASCADE, related_name="paiements")

    MODE_PAIEMENT_CHOICES = [
        ("ESPECES",  "Espèces"),
        ("VIREMENT", "Virement"),
        ("CHEQUE",   "Chèque"),
    ]

    date_paiement  = models.DateField(default=timezone.now)
    montant        = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    reference      = models.CharField(max_length=100, blank=True)
    mois           = models.CharField(max_length=3, choices=MOIS_CHOICES, blank=True, null=True)
    mode_paiement  = models.CharField(max_length=10, choices=MODE_PAIEMENT_CHOICES, blank=True, null=True)

    def clean(self):
        super().clean()
        # ✅ Cohérence résidence/lot (évite Paiement.residence != Lot.residence)
        if self.lot_id and self.residence_id and self.lot.residence_id != self.residence_id:
            raise ValidationError({"lot": "Ce lot n'appartient pas à la résidence du paiement."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        # Automatic caisse movement
        CaisseMouvement.objects.update_or_create(
            paiement=self,
            defaults={
                "residence": self.residence,
                "date_mouvement": self.date_paiement,
                "type_mouvement": "PAIEMENT",
                "sens": "DEBIT",
                "montant": self.montant,
                "libelle": f"Paiement lot {self.lot}",
            },
        )

    @property
    def montant_affecte(self):
        from django.db.models import Sum
        return self.affectations.aggregate(total=Sum("montant_affecte"))["total"] or Decimal("0")

    @property
    def montant_non_affecte(self):
        return self.montant - self.montant_affecte

    def __str__(self):
        return f"Paiement {self.lot.numero_lot} - {self.montant} ({self.date_paiement})"


# ============================================================
# APPEL DE CHARGE
# ============================================================
class AppelCharge(TimeStampedModel):
    """
    Appel global : CHARGE (mensuel/annuel) ou FOND (appel de fonds).
    La dette réelle par lot est dans DetailAppelCharge.
    """

    TYPE_CHARGE_CHOICES = [
        ("CHARGE", "Appel de Charge"),
        ("FOND", "Appel de Fond"),
    ]

    PERIODE_CHOICES = [
        ("ANNEE", "Année"),
        ("FOND",  "Appel de fond"),
    ]

    residence = models.ForeignKey(
        "Residence",
        on_delete=models.CASCADE,
        related_name="appels"
    )

    type_charge = models.CharField(max_length=10, choices=TYPE_CHARGE_CHOICES)

    exercice = models.IntegerField(
        validators=[MinValueValidator(2000), MaxValueValidator(2050)]
    )

    # ⚠️ On garde le champ tel quel pour ne pas casser l'app/migrations
    periode = models.CharField(
        max_length=30,
        choices=PERIODE_CHOICES,
        default="ANNEE"
    )

    # ⚠️ "code_fond" sert aussi de référence pour CHARGE dans ton code actuel.
    # Pour ne pas perturber, on garde le nom.
    code_fond = models.CharField(max_length=40, blank=True, null=True, db_index=True)

    # Champs utiles pour FOND
    nom_fond = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    description_appel = models.TextField(blank=True)

    date_emission = models.DateField(default=timezone.now)

    libelle = models.CharField(max_length=200, blank=True, help_text="Nom descriptif de l'appel (ex: Travaux ravalement 2026)")

    montant_total_appel = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Montant total de l'appel (utilisé en mode Tantième pour calculer la part de chaque lot)",
    )

    # Archivage : si non-null, cet appel est archivé dans cette ArchiveComptable.
    # SET_NULL au moment de la restauration (archive.delete()) = restauration automatique.
    archive_comptable = models.ForeignKey(
        "ArchiveComptable",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="appels_charges",
    )

    class Meta:
        constraints = [
            # ✅ Unicité CHARGE : (residence, exercice, periode)
            models.UniqueConstraint(
                fields=["residence", "exercice", "periode"],
                condition=Q(type_charge="CHARGE"),
                name="uniq_charge_res_exo_periode",
            ),
            # ✅ Unicité FOND : (residence, exercice, code_fond)
            models.UniqueConstraint(
                fields=["residence", "exercice", "code_fond"],
                condition=Q(type_charge="FOND"),
                name="uniq_fond_res_exo_code",
            ),
        ]
        ordering = ["-exercice", "periode"]

    def __str__(self):
        if self.type_charge == "FOND":
            return f"{self.residence.nom_residence} - {self.exercice} - {self.code_fond}"
        return f"{self.residence.nom_residence} - {self.exercice} - {self.periode}"
    
#---------------------------------------------------------------

    def clean(self):

        super().clean()

        if not self.residence_id:
            return

        if self.type_charge == "FOND":
            self.periode = "FOND"
            if not self.code_fond:
                ordre = (
                    AppelCharge.objects
                    .filter(residence=self.residence, exercice=self.exercice, type_charge="FOND")
                    .exclude(pk=self.pk)
                    .count() + 1
                )
                self.code_fond = f"AF_{self.exercice} {ordre}"
            return

        # ---- CHARGE — toujours annuelle ----
        if self.type_charge == "CHARGE":
            self.periode = "ANNEE"
            self.code_fond = f"ANNEE_{self.exercice}"
    
                


    def save(self, *args, **kwargs):
        # ✅ tu avais déjà ce principe, on garde
        self.full_clean()
        super().save(*args, **kwargs)

# ============================================================
# DETAIL APPEL DE CHARGE — version avec montant_recu + justificatif
# Remplacer la classe DetailAppelCharge dans models.py
# ============================================================

class DetailAppelCharge(TimeStampedModel):

    STATUT_CHOICES = [
        ("NON_PAYE", "Non payé"),
        ("PARTIEL",  "Partiel"),
        ("PAYE",     "Payé"),
    ]

    appel = models.ForeignKey(
        "AppelCharge",
        on_delete=models.CASCADE,
        related_name="details"
    )

    lot = models.ForeignKey(
        "Lot",
        on_delete=models.CASCADE,
        related_name="details_appels"
    )

    montant = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(0)]
    )

    # ✅ Nouveau : montant réellement reçu (somme des ventilations)
    montant_recu = models.DecimalField(
        max_digits=12, decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(0)]
    )

    # ✅ Nouveau : trace textuelle des ventilations (ex: "Pmt#12: +200.00 | Pmt#15: +50.00")
    justificatif = models.TextField(blank=True, default="")

    statut = models.CharField(
        max_length=10,
        choices=STATUT_CHOICES,
        default="NON_PAYE"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["appel", "lot"], name="uniq_lot_par_appel")
        ]

    def clean(self):
        super().clean()
        if self.appel_id and self.lot_id:
            if self.appel.residence_id != self.lot.residence_id:
                raise ValidationError(
                    "Le lot doit appartenir à la même résidence que l'appel de charge."
                )
        # ✅ montant_recu ne peut pas dépasser montant
        if self.montant_recu is not None and self.montant is not None:
            if self.montant_recu > self.montant:
                raise ValidationError(
                    {"montant_recu": "Le montant reçu ne peut pas dépasser le montant dû."}
                )
# --------------  +++++++ ---------------------------
    def recalcule_statut(self):
        """Met à jour statut selon montant_recu. À appeler après chaque ventilation."""
        if self.montant_recu <= 0:
            self.statut = "NON_PAYE"
        elif self.montant_recu < self.montant:
            self.statut = "PARTIEL"
        else:
            self.statut = "PAYE"

    def save(self, *args, **kwargs):
        # Recalcul automatique du statut avant chaque save
        self.recalcule_statut()
        self.full_clean()
        super().save(*args, **kwargs)

    
    def _rebuild_from_affectations(self):
        """
        Recalcule montant_recu et justificatif depuis les AffectationPaiement liées.
        À appeler après chaque création, modification ou suppression d'affectation.
        """
        from django.db.models import Sum
        from django.utils import timezone

        affectations = self.affectations.select_related("paiement").order_by(
            "paiement__date_paiement", "paiement__id"
        )

        total = affectations.aggregate(s=Sum("montant_affecte"))["s"] or Decimal("0")

        # Génération du justificatif
        lignes = []
        for a in affectations:
            pmt = a.paiement
            ref = f" [{pmt.reference}]" if pmt.reference else ""
            lignes.append(
                f"Pmt#{pmt.id}{ref} ({pmt.date_paiement}): +{a.montant_affecte}"
            )
        justif = " | ".join(lignes)

        # Mise à jour sans passer par full_clean (évite boucle)
        self.montant_recu = total
        self.justificatif = justif
        self.recalcule_statut()
        self.__class__.objects.filter(pk=self.pk).update(
            montant_recu = self.montant_recu,
            justificatif = self.justificatif,
            statut       = self.statut,
            updated_at   = timezone.now(),
        )

    

    def __str__(self):
        return f"{self.lot.numero_lot} - {self.appel.periode} - {self.montant}"
# ============================================================
# AFFECTATION PAIEMENT
# ============================================================
class AffectationPaiement(TimeStampedModel):
    """
    Table pivot : répartit un Paiement sur une dette (DetailAppelCharge).
    C'est le lien réel Paiement -> AppelCharge (via DetailAppelCharge.appel).
    """

    paiement = models.ForeignKey(
        "Paiement",
        on_delete=models.CASCADE,
        related_name="affectations"
    )

    detail = models.ForeignKey(
        "DetailAppelCharge",
        on_delete=models.CASCADE,
        related_name="affectations",
        null=True,
        blank=True
    )

    montant_affecte = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )

    class Meta:
        unique_together = ("paiement", "detail")

    def clean(self):
        """
        ✅ Validations critiques (sinon tu auras des incohérences comptables) :
        - même lot (paiement.lot == detail.lot)
        - même résidence (paiement.residence == detail.appel.residence)
        - pas dépasser le montant dû sur le détail
        - pas dépasser le montant total du paiement
        """
        super().clean()

        if not self.detail_id or not self.paiement_id:
            return

        # 1) Même lot
        if self.paiement.lot_id != self.detail.lot_id:
            raise ValidationError({"detail": "Ce détail n'appartient pas au même lot que le paiement."})

        # 2) Même résidence
        if self.paiement.residence_id != self.detail.appel.residence_id:
            raise ValidationError({"detail": "Ce détail n'appartient pas à la même résidence que le paiement."})

        # 3) Montant > 0 (MinValueValidator(0) autorise 0, on interdit ici 0)
        if self.montant_affecte <= 0:
            raise ValidationError({"montant_affecte": "Le montant affecté doit être > 0."})

        from django.db.models import Sum

        # 4) Ne pas dépasser le montant dû sur le détail
        deja_sur_detail = (
            AffectationPaiement.objects
            .filter(detail=self.detail)
            .exclude(pk=self.pk)
            .aggregate(s=Sum("montant_affecte"))["s"] or Decimal("0")
        )
        if deja_sur_detail + self.montant_affecte > self.detail.montant:
            raise ValidationError({"montant_affecte": "Affectation > montant dû sur ce détail."})

        # 5) Ne pas dépasser le montant du paiement
        deja_sur_paiement = (
            AffectationPaiement.objects
            .filter(paiement=self.paiement)
            .exclude(pk=self.pk)
            .aggregate(s=Sum("montant_affecte"))["s"] or Decimal("0")
        )
        if deja_sur_paiement + self.montant_affecte > self.paiement.montant:
            raise ValidationError({"montant_affecte": "Affectation > montant total du paiement."})

    # ============================================================
# AFFECTATION PAIEMENT — version avec montant_recu + justificatif
# Remplacer save() et ajouter delete() dans AffectationPaiement
# ============================================================

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

        if self.detail_id:
            self._update_detail()

    def delete(self, *args, **kwargs):
        detail = self.detail  # garder ref avant suppression
        super().delete(*args, **kwargs)
        if detail and detail.pk:
            detail._rebuild_from_affectations()

    def _update_detail(self):
        """
        Après création/modif d'une affectation :
        - Recalcule montant_recu = somme de toutes les affectations sur ce détail
        - Régénère le justificatif
        - Met à jour le statut
        """
        detail = self.detail
        detail._rebuild_from_affectations()

    # ── Méthode à ajouter sur DetailAppelCharge ──────────────
    # (voir fix_model_detail.py pour le modèle complet)
            
    def __str__(self):
        return f"{self.paiement} -> {self.detail}"


# ============================================================
# DEPENSES
# ============================================================

class CategorieDepense(TimeStampedModel):

    FAMILLE_CHOICES = [
        ("PERSONNEL",      "Personnel"),
        ("SECURITE",       "Sécurité"),
        ("NETTOYAGE",      "Nettoyage"),
        ("JARDINAGE",      "Jardinage"),
        ("ENERGIE",        "Énergie"),
        ("MAINTENANCE",    "Maintenance"),
        ("TRAVAUX",        "Travaux"),
        ("ADMIN",          "Administratif"),
        ("EQUIPEMENT",     "Équipement"),
        ("ANIMATION",      "Animation"),
        ("ASSURANCE_TAXE", "Assurance & Taxes"),
        ("DIVERS",         "Divers"),
    ]

    TYPE_DEPENSE_CHOICES = [
        ("SYSTEMATIQUE", "Systématique"),
        ("EVENTUELLE",   "Éventuelle"),
    ]

    NATURE_CHOICES = [
        ("FONCTIONNEMENT", "Fonctionnement"),
        ("INVESTISSEMENT",  "Investissement"),
    ]

    residence      = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="categories_depense")
    nom            = models.CharField(max_length=150)
    famille        = models.CharField(max_length=20, choices=FAMILLE_CHOICES, default="DIVERS")
    type_depense   = models.CharField(max_length=15, choices=TYPE_DEPENSE_CHOICES, default="EVENTUELLE")
    nature         = models.CharField(max_length=15, choices=NATURE_CHOICES, default="FONCTIONNEMENT")
    compte_defaut  = models.ForeignKey("CompteComptable", on_delete=models.PROTECT, null=True, blank=True, related_name="categories_defaut", verbose_name="Compte comptable par défaut")
    actif          = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["residence", "nom"], name="uniq_categorie_nom_par_residence")
        ]
        ordering = ["famille", "nom"]

    def __str__(self):
        return f"{self.nom} ({self.get_famille_display()})"


class Fournisseur(TimeStampedModel):

    GENRE_CHOICES = [
        ("M",   "M."),
        ("Mme", "Mme"),
    ]

    residence    = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="fournisseurs")
    nom_societe  = models.CharField(max_length=200, verbose_name="Nom société")
    genre        = models.CharField(max_length=5, choices=GENRE_CHOICES, blank=True)
    nom          = models.CharField(max_length=150, blank=True, verbose_name="Nom contact")
    prenom       = models.CharField(max_length=150, blank=True, verbose_name="Prénom contact")
    gsm          = models.CharField(max_length=30, blank=True)
    telephone    = models.CharField(max_length=30, blank=True)
    email        = models.EmailField(blank=True)
    actif        = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["residence", "nom_societe"], name="uniq_fournisseur_nom_societe_par_residence")
        ]
        ordering = ["nom_societe", "nom"]

    def __str__(self):
        return self.nom_societe or self.nom


class CompteComptable(TimeStampedModel):

    TYPE_CHOICES = [
        ("CHARGE",     "Charge"),
        ("PRODUIT",    "Produit"),
        ("TRESORERIE", "Trésorerie"),
    ]

    residence   = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="comptes_comptables")
    code        = models.CharField(max_length=10, verbose_name="Code")
    libelle     = models.CharField(max_length=200, verbose_name="Libellé")
    type_compte = models.CharField(max_length=15, choices=TYPE_CHOICES, default="CHARGE", verbose_name="Type")
    actif       = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["residence", "code"], name="uniq_compte_code_par_residence")
        ]
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.libelle}"


class FamilleDepense(TimeStampedModel):
    residence = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="familles_depense")
    nom       = models.CharField(max_length=100)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["residence", "nom"], name="uniq_famille_depense_nom")
        ]
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class ModeleDepense(TimeStampedModel):
    residence        = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="modeles_depense")
    nom              = models.CharField(max_length=200)
    categorie        = models.ForeignKey("CategorieDepense", on_delete=models.PROTECT, null=True, blank=True, related_name="modeles_depense_cat")
    compte_comptable = models.ForeignKey("CompteComptable", on_delete=models.PROTECT, null=True, blank=True, related_name="modeles_depense")
    fournisseur      = models.ForeignKey("Fournisseur", on_delete=models.SET_NULL, null=True, blank=True, related_name="modeles_depense")
    actif            = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["residence", "nom"], name="uniq_modele_depense_nom")
        ]
        ordering = ["categorie__nom", "nom"]

    def __str__(self):
        return self.nom


class Depense(TimeStampedModel):

    residence         = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="depenses")
    compte            = models.ForeignKey("CompteComptable", on_delete=models.PROTECT, related_name="depenses")
    modele_depense    = models.ForeignKey("ModeleDepense", on_delete=models.PROTECT, null=True, blank=True, related_name="depenses")
    categorie         = models.ForeignKey("CategorieDepense", on_delete=models.PROTECT, null=True, blank=True, related_name="depenses")
    fournisseur       = models.ForeignKey("Fournisseur", on_delete=models.PROTECT, null=True, blank=True, related_name="depenses")
    date_depense      = models.DateField(default=timezone.now)
    montant           = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    libelle           = models.CharField(max_length=255)
    detail            = models.TextField(blank=True)
    facture_reference = models.CharField(max_length=100, blank=True)
    justificatif      = models.FileField(upload_to="depenses/justificatifs/", blank=True, null=True)
    commentaire       = models.TextField(blank=True)
    mois              = models.CharField(max_length=3, choices=MOIS_CHOICES, blank=True, null=True)

    class Meta:
        ordering = ["-date_depense", "-created_at"]

    def clean(self):
        super().clean()
        if self.compte_id and self.residence_id:
            if self.compte.residence_id != self.residence_id:
                raise ValidationError({"compte": "Ce compte n'appartient pas à la résidence de la dépense."})
        if self.categorie_id and self.residence_id:
            if self.categorie.residence_id != self.residence_id:
                raise ValidationError({"categorie": "Cette catégorie n'appartient pas à la résidence de la dépense."})
        if self.fournisseur_id and self.residence_id:
            if self.fournisseur.residence_id != self.residence_id:
                raise ValidationError({"fournisseur": "Ce fournisseur n'appartient pas à la résidence de la dépense."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        # Automatic caisse movement
        CaisseMouvement.objects.update_or_create(
            depense=self,
            defaults={
                "residence": self.residence,
                "date_mouvement": self.date_depense,
                "type_mouvement": "DEPENSE",
                "sens": "CREDIT",
                "montant": self.montant,
                "libelle": self.libelle,
            },
        )

    def __str__(self):
        return f"{self.libelle} — {self.montant} ({self.date_depense})"


# ============================================================
# CONTRATS — contrats récurrents (sécurité, entretien, eau…)
# ============================================================

class Contrat(TimeStampedModel):

    TYPE_CHOICES = [
        ("SECURITE",    "Sécurité"),
        ("ENTRETIEN",   "Entretien"),
        ("JARDINAGE",   "Jardinage"),
        ("EAU",         "Eau"),
        ("ELECTRICITE", "Électricité"),
        ("ASCENSEUR",   "Ascenseur"),
        ("ASSURANCE",   "Assurance"),
        ("INTERNET",    "Internet / Télécom"),
        ("NETTOYAGE",   "Nettoyage"),
        ("AUTRE",       "Autre"),
    ]

    PERIODICITE_CHOICES = [
        ("MENSUEL",     "Mensuel"),
        ("BIMESTRIEL",  "Bimestriel (2 mois)"),
        ("TRIMESTRIEL", "Trimestriel (3 mois)"),
        ("SEMESTRIEL",  "Semestriel (6 mois)"),
        ("ANNUEL",      "Annuel"),
    ]

    residence        = models.ForeignKey("Residence",        on_delete=models.CASCADE,  related_name="contrats")
    reference_contrat = models.CharField(max_length=100, blank=True, help_text="Référence / numéro de contrat")
    type_contrat     = models.CharField(max_length=20,  choices=TYPE_CHOICES, blank=True, default="AUTRE")
    libelle          = models.CharField(max_length=255, help_text="Description du contrat")
    fournisseur      = models.ForeignKey("Fournisseur",      on_delete=models.PROTECT,  null=True, blank=True, related_name="contrats")
    periodicite      = models.CharField(max_length=20,  choices=PERIODICITE_CHOICES, default="MENSUEL")
    montant          = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    date_debut       = models.DateField()
    date_fin         = models.DateField(null=True, blank=True)
    actif            = models.BooleanField(default=True)
    notes            = models.TextField(blank=True)
    compte_comptable = models.ForeignKey("CompteComptable", on_delete=models.PROTECT, null=True, blank=True, related_name="contrats")
    categorie        = models.ForeignKey("CategorieDepense", on_delete=models.PROTECT, null=True, blank=True, related_name="contrats_cat")

    class Meta:
        ordering = ["type_contrat", "libelle"]

    def __str__(self):
        return f"{self.libelle} ({self.get_type_contrat_display()})"


# ============================================================
# CAISSE — journal des mouvements financiers
# ============================================================

class CaisseMouvement(TimeStampedModel):

    TYPE_CHOICES = [
        ("SOLDE_INITIAL",       "Solde initial"),
        ("PAIEMENT",            "Paiement copropriétaire"),
        ("RECETTE",             "Recette"),
        ("DEPENSE",             "Dépense"),
        ("AJUSTEMENT",          "Ajustement"),
        ("ARCHIVE_ADJUSTMENT",  "Ajustement archive"),
    ]

    SENS_CHOICES = [
        ("DEBIT",  "Entrée"),
        ("CREDIT", "Sortie"),
    ]

    residence      = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="caisse_mouvements")
    date_mouvement = models.DateField(default=timezone.now)
    type_mouvement = models.CharField(max_length=20, choices=TYPE_CHOICES)
    sens           = models.CharField(max_length=10, choices=SENS_CHOICES)
    montant        = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    libelle        = models.CharField(max_length=200)
    commentaire    = models.TextField(blank=True)
    paiement       = models.OneToOneField("Paiement", on_delete=models.CASCADE, null=True, blank=True, related_name="mouvement_caisse")
    depense        = models.OneToOneField("Depense",  on_delete=models.CASCADE, null=True, blank=True, related_name="mouvement_caisse")
    recette        = models.OneToOneField("Recette",  on_delete=models.CASCADE, null=True, blank=True, related_name="mouvement_caisse")

    class Meta:
        ordering = ["-date_mouvement", "-id"]

    def clean(self):
        super().clean()
        refs = sum([bool(self.paiement_id), bool(self.depense_id), bool(self.recette_id)])
        if refs > 1:
            raise ValidationError("Un mouvement ne peut pas référencer plusieurs objets à la fois.")
        if self.montant is not None and self.montant <= 0:
            raise ValidationError({"montant": "Le montant doit être > 0."})
        if self.paiement_id and self.residence_id:
            if self.paiement.residence_id != self.residence_id:
                raise ValidationError({"paiement": "Ce paiement n'appartient pas à la résidence du mouvement."})
        if self.depense_id and self.residence_id:
            if self.depense.residence_id != self.residence_id:
                raise ValidationError({"depense": "Cette dépense n'appartient pas à la résidence du mouvement."})

    def __str__(self):
        return f"{self.get_sens_display()} {self.montant} — {self.libelle} ({self.date_mouvement})"


# ============================================================
# RECETTE — encaissements hors paiements copropriétaires
# ============================================================

class Recette(TimeStampedModel):

    residence    = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="recettes")
    compte       = models.ForeignKey("CompteComptable", on_delete=models.PROTECT, related_name="recettes")
    date_recette = models.DateField(default=timezone.now)
    montant      = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    libelle      = models.CharField(max_length=200)
    source       = models.CharField(max_length=200, blank=True)
    commentaire  = models.TextField(blank=True)
    mois         = models.CharField(max_length=3, choices=MOIS_CHOICES, blank=True, null=True)

    class Meta:
        ordering = ["-date_recette", "-created_at"]

    def clean(self):
        super().clean()
        if self.compte_id and self.residence_id:
            if self.compte.residence_id != self.residence_id:
                raise ValidationError({"compte": "Ce compte n'appartient pas à la résidence de la recette."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        CaisseMouvement.objects.update_or_create(
            recette=self,
            defaults={
                "residence":      self.residence,
                "date_mouvement": self.date_recette,
                "type_mouvement": "RECETTE",
                "sens":           "DEBIT",
                "montant":        self.montant,
                "libelle":        self.libelle,
            },
        )

    def __str__(self):
        return f"{self.libelle} — {self.montant} ({self.date_recette})"


# ============================================================
# GOUVERNANCE
# ============================================================

class BureauSyndical(TimeStampedModel):

    FONCTION_CHOICES = [
        ("PRESIDENT",      "Président"),
        ("VICE_PRESIDENT", "Vice-Président"),
        ("TRESORIER",      "Trésorier"),
        ("SECRETAIRE",     "Secrétaire"),
        ("MEMBRE",         "Membre"),
    ]

    residence  = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="bureau_syndical")
    personne   = models.ForeignKey("Personne",  on_delete=models.PROTECT,  related_name="mandats_bureau")
    fonction   = models.CharField(max_length=30, choices=FONCTION_CHOICES, default="MEMBRE")
    date_debut = models.DateField()
    date_fin   = models.DateField(null=True, blank=True)
    actif      = models.BooleanField(default=True)

    class Meta:
        ordering = ["residence", "fonction"]

    def __str__(self):
        return f"{self.personne} — {self.get_fonction_display()} ({self.residence.nom_residence})"


class AssembleeGenerale(TimeStampedModel):

    TYPE_CHOICES = [
        ("ORDINAIRE",      "Ordinaire"),
        ("EXTRAORDINAIRE", "Extraordinaire"),
    ]

    STATUT_CHOICES = [
        ("PLANIFIEE",      "Planifiée"),
        ("TENUE",          "Tenue"),
        ("ANNULEE",        "Annulée"),
        ("PAS_DE_RETOUR",  "Pas de retour"),
    ]

    residence              = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="assemblees")
    date_ag                = models.DateField()
    type_ag                = models.CharField(max_length=20, choices=TYPE_CHOICES, default="ORDINAIRE")
    statut                 = models.CharField(max_length=20, choices=STATUT_CHOICES, default="PLANIFIEE")
    ordre_du_jour          = models.TextField(blank=True)
    pv_document            = models.FileField(upload_to="gouvernance/pv/", blank=True, null=True)
    convocation_envoyee_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-date_ag"]

    def __str__(self):
        return f"AG {self.get_type_ag_display()} — {self.date_ag}"


class Resolution(TimeStampedModel):

    RESULTAT_CHOICES = [
        ("ADOPTEE",  "Adoptée"),
        ("REJETEE",  "Rejetée"),
        ("AJOURNEE", "Ajournée"),
    ]

    assemblee_generale = models.ForeignKey("AssembleeGenerale", on_delete=models.CASCADE, related_name="resolutions")
    numero             = models.PositiveIntegerField()
    titre              = models.CharField(max_length=255)
    description        = models.TextField(blank=True)
    voix_pour          = models.PositiveIntegerField(default=0)
    voix_contre        = models.PositiveIntegerField(default=0)
    abstention         = models.PositiveIntegerField(default=0)
    resultat           = models.CharField(max_length=20, choices=RESULTAT_CHOICES, default="ADOPTEE")

    class Meta:
        ordering = ["assemblee_generale", "numero"]
        constraints = [
            models.UniqueConstraint(
                fields=["assemblee_generale", "numero"],
                name="uniq_resolution_numero_par_ag",
            )
        ]

    def __str__(self):
        return f"Résolution {self.numero} — {self.titre}"


class MandatBureauSyndical(TimeStampedModel):
    """
    Mandat du Bureau Syndical, élu lors d'une Assemblée Générale.
    Un seul mandat peut être actif par résidence.
    """
    residence          = models.ForeignKey("Residence",          on_delete=models.CASCADE,  related_name="mandats_bureau")
    assemblee_generale = models.ForeignKey("AssembleeGenerale",  on_delete=models.SET_NULL, null=True, blank=True, related_name="mandats_bureau")
    date_debut         = models.DateField()
    date_fin           = models.DateField(null=True, blank=True)
    actif              = models.BooleanField(default=True)

    class Meta:
        ordering = ["-date_debut"]

    def __str__(self):
        return f"Mandat Bureau {self.residence.nom_residence} — {self.date_debut}"


class MandatBureauMembre(TimeStampedModel):
    """Membre d'un mandat du Bureau Syndical."""

    FONCTION_CHOICES = [
        ("PRESIDENT",      "Président"),
        ("VICE_PRESIDENT", "Vice-Président"),
        ("TRESORIER",      "Trésorier"),
        ("SECRETAIRE",     "Secrétaire"),
        ("MEMBRE",         "Membre"),
    ]

    mandat   = models.ForeignKey("MandatBureauSyndical", on_delete=models.CASCADE, related_name="membres")
    personne = models.ForeignKey("Personne",             on_delete=models.PROTECT,  related_name="mandats_membre")
    fonction = models.CharField(max_length=30, choices=FONCTION_CHOICES, default="MEMBRE")

    class Meta:
        ordering = ["fonction"]
        constraints = [
            models.UniqueConstraint(fields=["mandat", "personne"], name="uniq_personne_par_mandat")
        ]

    def __str__(self):
        return f"{self.personne} — {self.get_fonction_display()}"


class DocumentGouvernance(TimeStampedModel):

    TYPE_CHOICES = [
        ("PV",        "Procès-verbal"),
        ("REGLEMENT", "Règlement"),
        ("CONTRAT",   "Contrat"),
        ("RAPPORT",   "Rapport"),
        ("AUTRE",     "Autre"),
    ]

    residence        = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="documents_gouvernance")
    type_document    = models.CharField(max_length=20, choices=TYPE_CHOICES, default="AUTRE", verbose_name="Type")
    titre            = models.CharField(max_length=255)
    fichier          = models.FileField(upload_to="gouvernance/documents/", blank=True, null=True)
    date             = models.DateField()
    visible_resident = models.BooleanField(default=False)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.titre} ({self.get_type_document_display()})"


# ============================================================
# ARCHIVAGE COMPTABLE
# ============================================================

class ArchiveComptable(TimeStampedModel):
    """Registre d'une archive financière (dépenses / paiements / recettes)."""

    residence      = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="archives")
    start_date     = models.DateField(verbose_name="Début de période")
    end_date       = models.DateField(verbose_name="Fin de période")
    total_recettes = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_depenses = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    solde          = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    commentaire    = models.TextField(blank=True)
    caisse_mouvement = models.OneToOneField(
        "CaisseMouvement", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="archive"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Archive {self.start_date} → {self.end_date}"


class ArchiveDepense(models.Model):
    archive           = models.ForeignKey(ArchiveComptable, on_delete=models.CASCADE, related_name="depenses")
    residence         = models.ForeignKey("Residence", on_delete=models.PROTECT, related_name="archive_depenses")
    compte            = models.ForeignKey("CompteComptable", on_delete=models.PROTECT, related_name="archive_depenses")
    categorie         = models.ForeignKey("CategorieDepense", on_delete=models.SET_NULL, null=True, blank=True, related_name="archive_depenses")
    fournisseur       = models.ForeignKey("Fournisseur", on_delete=models.SET_NULL, null=True, blank=True, related_name="archive_depenses")
    date_depense      = models.DateField()
    montant           = models.DecimalField(max_digits=12, decimal_places=2)
    libelle           = models.CharField(max_length=255)
    detail            = models.TextField(blank=True)
    facture_reference = models.CharField(max_length=100, blank=True)
    commentaire       = models.TextField(blank=True)
    mois              = models.CharField(max_length=3, choices=MOIS_CHOICES, blank=True, null=True)
    original_id       = models.IntegerField()

    class Meta:
        ordering = ["-date_depense"]


class ArchivePaiement(models.Model):
    archive        = models.ForeignKey(ArchiveComptable, on_delete=models.CASCADE, related_name="paiements")
    residence      = models.ForeignKey("Residence", on_delete=models.PROTECT, related_name="archive_paiements")
    lot            = models.ForeignKey("Lot", on_delete=models.SET_NULL, null=True, blank=True, related_name="archive_paiements")
    date_paiement  = models.DateField()
    montant        = models.DecimalField(max_digits=12, decimal_places=2)
    reference      = models.CharField(max_length=100, blank=True)
    mois           = models.CharField(max_length=3, choices=MOIS_CHOICES, blank=True, null=True)
    mode_paiement  = models.CharField(
        max_length=10,
        choices=[("ESPECES", "Espèces"), ("VIREMENT", "Virement"), ("CHEQUE", "Chèque")],
        blank=True, null=True,
    )
    original_id    = models.IntegerField()

    class Meta:
        ordering = ["-date_paiement"]


class ArchiveAffectationPaiement(models.Model):
    """Ventilations archivées — restaurées avec les paiements."""
    archive_paiement = models.ForeignKey(
        ArchivePaiement, on_delete=models.CASCADE, related_name="affectations"
    )
    detail           = models.ForeignKey(
        "DetailAppelCharge", on_delete=models.PROTECT, related_name="archive_affectations"
    )
    montant_affecte  = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = ("archive_paiement", "detail")


class ArchiveRecette(models.Model):
    archive      = models.ForeignKey(ArchiveComptable, on_delete=models.CASCADE, related_name="recettes")
    residence    = models.ForeignKey("Residence", on_delete=models.PROTECT, related_name="archive_recettes")
    compte       = models.ForeignKey("CompteComptable", on_delete=models.PROTECT, related_name="archive_recettes")
    date_recette = models.DateField()
    montant      = models.DecimalField(max_digits=12, decimal_places=2)
    libelle      = models.CharField(max_length=200)
    source       = models.CharField(max_length=200, blank=True)
    commentaire  = models.TextField(blank=True)
    mois         = models.CharField(max_length=3, choices=MOIS_CHOICES, blank=True, null=True)
    original_id  = models.IntegerField()

    class Meta:
        ordering = ["-date_recette"]


# ============================================================
# TRAVAUX RÉALISÉS
# ============================================================

class Travaux(models.Model):

    STATUT_CHOICES = [
        ("PLANIFIE",    "Planifié"),
        ("EN_COURS",    "En cours"),
        ("TERMINE",     "Terminé"),
        ("ANNULE",      "Annulé"),
        ("INFORMATION", "Information"),
    ]

    residence    = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="travaux")
    date_travaux = models.DateField(verbose_name="Date")
    nature       = models.CharField(max_length=200, verbose_name="Nature des travaux")
    description  = models.TextField(blank=True, verbose_name="Description")
    montant      = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Montant (MAD)",
    )
    fournisseur  = models.ForeignKey(
        "Fournisseur", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="travaux",
        verbose_name="Prestataire",
    )
    statut       = models.CharField(max_length=15, choices=STATUT_CHOICES, default="PLANIFIE")
    commentaire  = models.TextField(blank=True)

    class Meta:
        ordering = ["-date_travaux", "-id"]

    def __str__(self):
        return f"{self.nature} ({self.date_travaux})"


# ============================================================
# NOTIFICATIONS
# ============================================================

class Notification(models.Model):

    TYPE_CHOICES = [
        ("SMS",     "SMS"),
        ("MESSAGE", "Message"),
        ("SYSTEM",  "Système"),
    ]
    STATUT_CHOICES = [
        ("ENVOYE", "Envoyé"),
        ("LU",     "Lu"),
        ("NON_LU", "Non lu"),
    ]

    residence          = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="notifications")
    lot                = models.ForeignKey("Lot", on_delete=models.CASCADE, related_name="notifications", null=True, blank=True)
    personne           = models.ForeignKey("Personne", on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications")
    date_notification  = models.DateTimeField(auto_now_add=True)
    type_notification  = models.CharField(max_length=10, choices=TYPE_CHOICES, default="SMS")
    titre              = models.CharField(max_length=200)
    message            = models.TextField()
    montant_du         = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    statut             = models.CharField(max_length=10, choices=STATUT_CHOICES, default="ENVOYE")

    class Meta:
        ordering = ["-date_notification"]

    def __str__(self):
        return f"[{self.type_notification}] {self.titre} — {self.date_notification:%Y-%m-%d}"


# ============================================================

class MessageResident(TimeStampedModel):
    """Réclamations / messages envoyés par les résidents."""

    STATUT_CHOICES = [
        ("NOUVEAU",  "Nouveau"),
        ("EN_COURS", "En cours"),
        ("RESOLU",   "Résolu"),
    ]

    residence  = models.ForeignKey("Residence", on_delete=models.CASCADE,  related_name="messages_resident")
    lot        = models.ForeignKey("Lot",       on_delete=models.SET_NULL,  related_name="messages_resident", null=True, blank=True)
    expediteur = models.ForeignKey(User,        on_delete=models.SET_NULL,  related_name="messages_envoyes",  null=True, blank=True)
    objet      = models.CharField(max_length=200)
    message    = models.TextField()
    statut     = models.CharField(max_length=20, choices=STATUT_CHOICES, default="NOUVEAU")
    reponse    = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.statut}] {self.objet}"


# ============================================================
# PASSATION DE CONSIGNES
# ============================================================

class PassationConsignes(TimeStampedModel):
    """Procès-verbal de passation de consignes lors d'un changement de bureau."""

    assemblee       = models.OneToOneField(
        "AssembleeGenerale", on_delete=models.CASCADE,
        related_name="passation_consignes", null=True, blank=True
    )
    residence       = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="passations_consignes")
    date_passation  = models.DateTimeField()
    solde_caisse    = models.DecimalField(max_digits=14, decimal_places=2, default=0,
                        help_text="Calculé automatiquement depuis la caisse")
    solde_banque    = models.DecimalField(max_digits=14, decimal_places=2, default=0,
                        help_text="Solde compte bancaire saisi manuellement")
    justification_ecart = models.TextField(blank=True,
                        help_text="Explication si solde caisse ≠ solde banque (ex: chèque non encaissé)")
    notes           = models.TextField(blank=True)

    # Signataires sortants
    nom_syndic      = models.CharField(max_length=150, blank=True)
    nom_tresorier   = models.CharField(max_length=150, blank=True)
    # Signataires entrants
    nom_syndic_entrant      = models.CharField(max_length=150, blank=True)
    nom_tresorier_entrant   = models.CharField(max_length=150, blank=True)

    class Meta:
        ordering = ["-date_passation"]

    def __str__(self):
        return f"Passation {self.date_passation} — {self.residence}"


class ReservePassation(models.Model):
    """Ligne de réserve / remarque dans une passation de consignes."""

    passation   = models.ForeignKey(PassationConsignes, on_delete=models.CASCADE, related_name="reserves")
    libelle     = models.CharField(max_length=255)
    montant     = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True,
                    help_text="Montant associé si applicable")
    ordre       = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["ordre", "id"]

    def __str__(self):
        return self.libelle


# ============================================================
# RÉSOLUTIONS PAR VOTE
# ============================================================

class ResolutionVote(TimeStampedModel):

    STATUS_CHOICES = [
        ("EN_PREPARATION", "En préparation"),
        ("EN_COURS",       "En cours de vote"),
        ("CLOTURE",        "Clôturé"),
    ]
    TYPE_VOTE_CHOICES = [
        ("MAJORITE_SIMPLE",  "Majorité simple (> 50 % des votants)"),
        ("MAJORITE_ABSOLUE", "Majorité absolue (> 50 % des copropriétaires)"),
        ("DOUBLE_MAJORITE",  "Double majorité"),
        ("UNANIMITE",        "Unanimité"),
    ]

    residence         = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="resolutions_vote")
    assemblee         = models.ForeignKey("AssembleeGenerale", on_delete=models.CASCADE, null=True, blank=True, related_name="resolutions_vote")
    intitule          = models.CharField(max_length=250)
    description       = models.TextField(blank=True)
    type_vote         = models.CharField(max_length=30, choices=TYPE_VOTE_CHOICES, default="MAJORITE_SIMPLE")
    date_resolution   = models.DateField()
    date_debut_vote   = models.DateTimeField(null=True, blank=True)
    date_cloture_vote = models.DateTimeField(null=True, blank=True)
    statut            = models.CharField(max_length=20, choices=STATUS_CHOICES, default="EN_PREPARATION")

    class Meta:
        ordering = ["-date_resolution", "-created_at"]

    def __str__(self):
        return f"{self.intitule} ({self.get_statut_display()})"

    @property
    def statut_effectif(self):
        """Statut calculé automatiquement en fonction des dates."""
        from django.utils import timezone
        from django.utils.dateparse import parse_datetime

        def to_dt(val):
            if not val:
                return None
            if isinstance(val, str):
                dt = parse_datetime(val)
                if dt and timezone.is_naive(dt):
                    dt = timezone.make_aware(dt)
                return dt
            if hasattr(val, 'tzinfo') and val.tzinfo is None:
                return timezone.make_aware(val)
            return val

        now = timezone.now()
        d1 = to_dt(self.date_debut_vote)
        d2 = to_dt(self.date_cloture_vote)
        if d1 and d2:
            if now < d1:
                return "EN_PREPARATION"
            elif now <= d2:
                return "EN_COURS"
            else:
                return "CLOTURE"
        if d1:
            return "EN_PREPARATION" if now < d1 else "EN_COURS"
        if d2:
            return "CLOTURE" if now > d2 else self.statut
        return self.statut


class VoteResident(TimeStampedModel):

    CHOIX_CHOICES = [("OUI", "Oui"), ("NON", "Non"), ("NEUTRE", "Neutre")]

    resolution = models.ForeignKey(ResolutionVote, on_delete=models.CASCADE, related_name="votes")
    lot        = models.ForeignKey("Lot", on_delete=models.CASCADE, related_name="votes_resolution")
    user       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    choix      = models.CharField(max_length=10, choices=CHOIX_CHOICES)

    class Meta:
        unique_together = ("resolution", "lot")
        ordering = ["lot__numero_lot"]


class NotificationVote(TimeStampedModel):

    resolution      = models.ForeignKey(ResolutionVote, on_delete=models.CASCADE, related_name="notifications_vote")
    lot             = models.ForeignKey("Lot", on_delete=models.CASCADE, related_name="notifications_vote")
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("resolution", "lot")


# ============================================================
# MODULE IA — documents et configuration
# ============================================================

class AIDocument(TimeStampedModel):
    """Document PDF uploadé pour alimenter le contexte de l'IA."""
    residence     = models.ForeignKey("Residence", on_delete=models.CASCADE, related_name="ai_documents")
    nom           = models.CharField(max_length=255)
    fichier       = models.FileField(upload_to="ai_docs/")
    texte_extrait = models.TextField(blank=True)
    actif         = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.nom


# ============================================================
# SUIVI PAR LOT
# ============================================================

class SuiviLot(TimeStampedModel):
    """Historique des actions de recouvrement / suivi prises envers un lot."""

    TYPE_CHOICES = [
        ("RAPPEL",           "Rappel"),
        ("MISE_EN_DEMEURE",  "Mise en demeure"),
        ("POURSUITE",        "Poursuite judiciaire"),
        ("ARRANGEMENT",      "Arrangement / Accord"),
        ("APPEL_TEL",        "Appel téléphonique"),
        ("VISITE",           "Visite"),
        ("COURRIER",         "Courrier"),
        ("HUISSIER",         "Huissier"),
        ("AUTRE",            "Autre"),
    ]

    lot         = models.ForeignKey("Lot",      on_delete=models.CASCADE, related_name="suivis")
    type_action = models.CharField(max_length=30, choices=TYPE_CHOICES, default="RAPPEL")
    date_action = models.DateField()
    reference   = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    auteur      = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["-date_action", "-created_at"]

    def __str__(self):
        return f"{self.get_type_action_display()} — Lot {self.lot.numero_lot} — {self.date_action}"


class AIConfig(TimeStampedModel):
    """Configuration IA globale (unique, residence=None)."""
    residence     = models.OneToOneField("Residence", on_delete=models.CASCADE,
                        related_name="ai_config", null=True, blank=True)
    system_prompt = models.TextField(blank=True, default="")
    api_url       = models.CharField(max_length=500, blank=True,
                        default="https://api.groq.com/openai/v1/chat/completions")
    api_key       = models.CharField(max_length=500, blank=True)
    model_name    = models.CharField(max_length=100, blank=True, default="llama-3.1-8b-instant")

    def __str__(self):
        return f"AIConfig — {self.residence}"
        ordering = ["lot__numero_lot"]
