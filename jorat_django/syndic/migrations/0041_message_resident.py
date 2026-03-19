from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("syndic", "0040_archive_affectation_paiement"),
    ]

    operations = [
        migrations.CreateModel(
            name="MessageResident",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("objet",    models.CharField(max_length=200)),
                ("message",  models.TextField()),
                ("statut",   models.CharField(
                    choices=[("NOUVEAU", "Nouveau"), ("EN_COURS", "En cours"), ("RESOLU", "Résolu")],
                    default="NOUVEAU", max_length=20,
                )),
                ("reponse",  models.TextField(blank=True, default="")),
                ("expediteur", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="messages_envoyes",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("lot", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="messages_resident",
                    to="syndic.lot",
                )),
                ("residence", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="messages_resident",
                    to="syndic.residence",
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
