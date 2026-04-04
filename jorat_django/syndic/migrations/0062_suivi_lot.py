from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0061_tantiemes_mode_repartition"),
    ]

    operations = [
        migrations.CreateModel(
            name="SuiviLot",
            fields=[
                ("id",          models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at",  models.DateTimeField(auto_now_add=True)),
                ("updated_at",  models.DateTimeField(auto_now=True)),
                ("type_action", models.CharField(
                    choices=[
                        ("RAPPEL",          "Rappel"),
                        ("MISE_EN_DEMEURE", "Mise en demeure"),
                        ("POURSUITE",       "Poursuite judiciaire"),
                        ("ARRANGEMENT",     "Arrangement / Accord"),
                        ("APPEL_TEL",       "Appel téléphonique"),
                        ("VISITE",          "Visite"),
                        ("COURRIER",        "Courrier"),
                        ("HUISSIER",        "Huissier"),
                        ("AUTRE",           "Autre"),
                    ],
                    default="RAPPEL",
                    max_length=30,
                )),
                ("date_action", models.DateField()),
                ("reference",   models.CharField(blank=True, max_length=100)),
                ("description", models.TextField(blank=True)),
                ("auteur",      models.CharField(blank=True, max_length=100)),
                ("lot",         models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="suivis",
                    to="syndic.lot",
                )),
            ],
            options={"ordering": ["-date_action", "-created_at"]},
        ),
    ]
