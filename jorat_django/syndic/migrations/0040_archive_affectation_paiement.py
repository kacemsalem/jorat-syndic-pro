from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0039_famille_modele_depense"),
    ]

    operations = [
        migrations.CreateModel(
            name="ArchiveAffectationPaiement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("montant_affecte", models.DecimalField(decimal_places=2, max_digits=12)),
                ("archive_paiement", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="affectations", to="syndic.archivepaiement")),
                ("detail", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="archive_affectations", to="syndic.detailappelcharge")),
            ],
            options={"unique_together": {("archive_paiement", "detail")}},
        ),
    ]
