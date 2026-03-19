from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0024_recette"),
    ]

    operations = [
        migrations.AddField(
            model_name="comptecomptable",
            name="type_compte",
            field=models.CharField(
                choices=[
                    ("CHARGE",     "Charge"),
                    ("PRODUIT",    "Produit"),
                    ("TRESORERIE", "Trésorerie"),
                ],
                default="CHARGE",
                max_length=15,
                verbose_name="Type",
            ),
        ),
    ]
