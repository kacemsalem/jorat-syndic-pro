from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0034_add_mois_field"),
    ]

    operations = [
        migrations.AddField(
            model_name="paiement",
            name="mode_paiement",
            field=models.CharField(
                blank=True, null=True, max_length=10,
                choices=[
                    ("ESPECES",  "Espèces"),
                    ("VIREMENT", "Virement"),
                    ("CHEQUE",   "Chèque"),
                ],
            ),
        ),
    ]
