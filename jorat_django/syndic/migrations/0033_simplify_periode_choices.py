from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0032_archive_comptable"),
    ]

    operations = [
        # Mise à jour des choix (cosmétique Django, pas de contrainte DB)
        migrations.AlterField(
            model_name="appelcharge",
            name="periode",
            field=models.CharField(
                max_length=30,
                choices=[
                    ("ANNEE", "Année"),
                    ("FOND",  "Appel de fond"),
                ],
                default="ANNEE",
            ),
        ),
        # Note : les enregistrements mensuels existants sont conservés intacts
        # (ils ont des DetailAppelCharge liés). Seuls les nouveaux enregistrements
        # seront soumis aux nouvelles règles (ANNEE ou FOND uniquement).
    ]
