from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0058_unify_categorie_depense"),
    ]

    operations = [
        migrations.AlterField(
            model_name="assembleegenerale",
            name="statut",
            field=models.CharField(
                choices=[
                    ("PLANIFIEE",     "Planifiée"),
                    ("TENUE",         "Tenue"),
                    ("ANNULEE",       "Annulée"),
                    ("PAS_DE_RETOUR", "Pas de retour"),
                ],
                default="PLANIFIEE",
                max_length=20,
            ),
        ),
    ]
