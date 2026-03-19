from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0035_paiement_mode_paiement"),
    ]

    operations = [
        migrations.AddField(
            model_name="archivedepense",
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
            model_name="archivepaiement",
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
            model_name="archivepaiement",
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
        migrations.AddField(
            model_name="archiverecette",
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
