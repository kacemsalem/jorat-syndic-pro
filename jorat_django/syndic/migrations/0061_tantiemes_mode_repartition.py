from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0060_fournisseur_nom_societe_required"),
    ]

    operations = [
        # Résidence : mode de répartition
        migrations.AddField(
            model_name="residence",
            name="mode_repartition",
            field=models.CharField(
                choices=[
                    ("PART_EGALE", "Part égale"),
                    ("MANUEL", "Montant manuel"),
                    ("TANTIEME", "Tantième (‰)"),
                ],
                default="PART_EGALE",
                help_text="Méthode de répartition des charges entre les lots",
                max_length=12,
            ),
        ),
        # Lot : quote-part en millièmes
        migrations.AddField(
            model_name="lot",
            name="tantiemes",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Quote-part en millièmes (ex : 85.50 pour 85.50/1000)",
                max_digits=7,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        # AppelCharge : montant total de l'appel
        migrations.AddField(
            model_name="appelcharge",
            name="montant_total_appel",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Montant total de l'appel (utilisé en mode Tantième pour calculer la part de chaque lot)",
                max_digits=14,
                null=True,
            ),
        ),
    ]
