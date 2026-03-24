from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0050_passation_datetime"),
    ]

    operations = [
        migrations.CreateModel(
            name="AIDocument",
            fields=[
                ("id",            models.BigAutoField(auto_created=True, primary_key=True)),
                ("created_at",    models.DateTimeField(auto_now_add=True)),
                ("updated_at",    models.DateTimeField(auto_now=True)),
                ("nom",           models.CharField(max_length=255)),
                ("fichier",       models.FileField(upload_to="ai_docs/")),
                ("texte_extrait", models.TextField(blank=True)),
                ("actif",         models.BooleanField(default=True)),
                ("residence",     models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="ai_documents",
                    to="syndic.residence",
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="AIConfig",
            fields=[
                ("id",            models.BigAutoField(auto_created=True, primary_key=True)),
                ("created_at",    models.DateTimeField(auto_now_add=True)),
                ("updated_at",    models.DateTimeField(auto_now=True)),
                ("system_prompt", models.TextField(blank=True, default="")),
                ("api_url",       models.CharField(
                    blank=True, max_length=500,
                    default="https://api.groq.com/openai/v1/chat/completions",
                )),
                ("api_key",       models.CharField(blank=True, max_length=500)),
                ("model_name",    models.CharField(blank=True, max_length=100,
                                                   default="llama-3.1-8b-instant")),
                ("residence",     models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="ai_config",
                    to="syndic.residence",
                )),
            ],
        ),
    ]
