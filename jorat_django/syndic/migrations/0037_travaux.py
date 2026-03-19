from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0036_archive_mois_mode_paiement"),
    ]

    operations = [
        migrations.CreateModel(
            name="Travaux",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date_travaux", models.DateField(verbose_name="Date")),
                ("nature",       models.CharField(max_length=200, verbose_name="Nature des travaux")),
                ("description",  models.TextField(blank=True, verbose_name="Description")),
                ("montant",      models.DecimalField(
                    blank=True, null=True, max_digits=12, decimal_places=2,
                    validators=[django.core.validators.MinValueValidator(Decimal("0"))],
                    verbose_name="Montant (MAD)",
                )),
                ("statut",       models.CharField(
                    max_length=10, default="PLANIFIE",
                    choices=[
                        ("PLANIFIE", "Planifié"),
                        ("EN_COURS", "En cours"),
                        ("TERMINE",  "Terminé"),
                        ("ANNULE",   "Annulé"),
                    ],
                )),
                ("commentaire",  models.TextField(blank=True)),
                ("residence",    models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="travaux", to="syndic.residence",
                )),
                ("fournisseur",  models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="travaux", to="syndic.fournisseur",
                    verbose_name="Prestataire",
                )),
            ],
            options={
                "ordering": ["-date_travaux", "-id"],
            },
        ),
    ]
