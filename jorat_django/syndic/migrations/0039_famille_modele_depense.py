from django.db import migrations, models
import django.db.models.deletion

FAMILLE_LABELS = {
    "PERSONNEL":      "Personnel",
    "SECURITE":       "Sécurité",
    "NETTOYAGE":      "Nettoyage",
    "JARDINAGE":      "Jardinage",
    "ENERGIE":        "Énergie",
    "MAINTENANCE":    "Maintenance",
    "TRAVAUX":        "Travaux",
    "ADMIN":          "Administratif",
    "EQUIPEMENT":     "Équipement",
    "ANIMATION":      "Animation",
    "ASSURANCE_TAXE": "Assurance & Taxes",
    "DIVERS":         "Divers",
}


def migrate_categories_to_modeles(apps, schema_editor):
    CategorieDepense = apps.get_model("syndic", "CategorieDepense")
    FamilleDepense   = apps.get_model("syndic", "FamilleDepense")
    ModeleDepense    = apps.get_model("syndic", "ModeleDepense")

    for categorie in CategorieDepense.objects.select_related("residence", "compte_defaut").all():
        famille_nom = FAMILLE_LABELS.get(categorie.famille, categorie.famille)
        famille, _ = FamilleDepense.objects.get_or_create(
            residence=categorie.residence,
            nom=famille_nom,
        )
        ModeleDepense.objects.get_or_create(
            residence=categorie.residence,
            nom=categorie.nom,
            defaults={
                "famille_depense": famille,
                "compte_comptable": categorie.compte_defaut,
                "actif": categorie.actif,
            },
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0038_notification_model"),
    ]

    operations = [
        # FamilleDepense
        migrations.CreateModel(
            name="FamilleDepense",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("nom", models.CharField(max_length=100)),
                ("residence", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="familles_depense", to="syndic.residence")),
            ],
            options={"ordering": ["nom"]},
        ),
        migrations.AddConstraint(
            model_name="familledepense",
            constraint=models.UniqueConstraint(fields=["residence", "nom"], name="uniq_famille_depense_nom"),
        ),
        # ModeleDepense
        migrations.CreateModel(
            name="ModeleDepense",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("nom", models.CharField(max_length=200)),
                ("actif", models.BooleanField(default=True)),
                ("residence", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="modeles_depense", to="syndic.residence")),
                ("famille_depense", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="modeles", to="syndic.familledepense")),
                ("compte_comptable", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="modeles_depense", to="syndic.comptecomptable")),
                ("fournisseur", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="modeles_depense", to="syndic.fournisseur")),
            ],
            options={"ordering": ["famille_depense__nom", "nom"]},
        ),
        migrations.AddConstraint(
            model_name="modeledepense",
            constraint=models.UniqueConstraint(fields=["residence", "nom"], name="uniq_modele_depense_nom"),
        ),
        # Add modele_depense FK on Depense
        migrations.AddField(
            model_name="depense",
            name="modele_depense",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="depenses", to="syndic.modeledepense"),
        ),
        # Data migration
        migrations.RunPython(migrate_categories_to_modeles, noop),
    ]
