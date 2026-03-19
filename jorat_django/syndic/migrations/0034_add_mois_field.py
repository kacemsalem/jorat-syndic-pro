from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0033_simplify_periode_choices"),
    ]

    operations = [
        migrations.AddField(
            model_name="paiement",
            name="mois",
            field=models.CharField(
                blank=True, null=True, max_length=3,
                choices=[
                    ("JAN", "Janvier"), ("FEV", "Février"),  ("MAR", "Mars"),
                    ("AVR", "Avril"),   ("MAI", "Mai"),       ("JUN", "Juin"),
                    ("JUL", "Juillet"), ("AOU", "Août"),      ("SEP", "Septembre"),
                    ("OCT", "Octobre"), ("NOV", "Novembre"),  ("DEC", "Décembre"),
                ],
            ),
        ),
        migrations.AddField(
            model_name="depense",
            name="mois",
            field=models.CharField(
                blank=True, null=True, max_length=3,
                choices=[
                    ("JAN", "Janvier"), ("FEV", "Février"),  ("MAR", "Mars"),
                    ("AVR", "Avril"),   ("MAI", "Mai"),       ("JUN", "Juin"),
                    ("JUL", "Juillet"), ("AOU", "Août"),      ("SEP", "Septembre"),
                    ("OCT", "Octobre"), ("NOV", "Novembre"),  ("DEC", "Décembre"),
                ],
            ),
        ),
        migrations.AddField(
            model_name="recette",
            name="mois",
            field=models.CharField(
                blank=True, null=True, max_length=3,
                choices=[
                    ("JAN", "Janvier"), ("FEV", "Février"),  ("MAR", "Mars"),
                    ("AVR", "Avril"),   ("MAI", "Mai"),       ("JUN", "Juin"),
                    ("JUL", "Juillet"), ("AOU", "Août"),      ("SEP", "Septembre"),
                    ("OCT", "Octobre"), ("NOV", "Novembre"),  ("DEC", "Décembre"),
                ],
            ),
        ),
    ]
