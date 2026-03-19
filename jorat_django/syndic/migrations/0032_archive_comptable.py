from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0031_remove_date_retard_refus"),
    ]

    operations = [
        # Update CaisseMouvement TYPE_CHOICES (metadata only, no schema change)
        migrations.AlterField(
            model_name="caissemouvement",
            name="type_mouvement",
            field=models.CharField(
                max_length=20,
                choices=[
                    ("SOLDE_INITIAL",      "Solde initial"),
                    ("PAIEMENT",           "Paiement copropriétaire"),
                    ("RECETTE",            "Recette"),
                    ("DEPENSE",            "Dépense"),
                    ("AJUSTEMENT",         "Ajustement"),
                    ("ARCHIVE_ADJUSTMENT", "Ajustement archive"),
                ],
            ),
        ),
        # ArchiveComptable
        migrations.CreateModel(
            name="ArchiveComptable",
            fields=[
                ("id",             models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("created_at",     models.DateTimeField(auto_now_add=True)),
                ("updated_at",     models.DateTimeField(auto_now=True)),
                ("start_date",     models.DateField(verbose_name="Début de période")),
                ("end_date",       models.DateField(verbose_name="Fin de période")),
                ("total_recettes", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("total_depenses", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("solde",          models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("commentaire",    models.TextField(blank=True)),
                ("residence",      models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="archives", to="syndic.residence")),
                ("caisse_mouvement", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="archive", to="syndic.caissemouvement")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        # ArchiveDepense
        migrations.CreateModel(
            name="ArchiveDepense",
            fields=[
                ("id",                models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("date_depense",      models.DateField()),
                ("montant",           models.DecimalField(decimal_places=2, max_digits=12)),
                ("libelle",           models.CharField(max_length=255)),
                ("detail",            models.TextField(blank=True)),
                ("facture_reference", models.CharField(blank=True, max_length=100)),
                ("commentaire",       models.TextField(blank=True)),
                ("original_id",       models.IntegerField()),
                ("archive",     models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="depenses",     to="syndic.archivecomptable")),
                ("residence",   models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="archive_depenses", to="syndic.residence")),
                ("compte",      models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="archive_depenses", to="syndic.comptecomptable")),
                ("categorie",   models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="archive_depenses",  to="syndic.categoriedepense")),
                ("fournisseur", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="archive_depenses",  to="syndic.fournisseur")),
            ],
            options={"ordering": ["-date_depense"]},
        ),
        # ArchivePaiement
        migrations.CreateModel(
            name="ArchivePaiement",
            fields=[
                ("id",            models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("date_paiement", models.DateField()),
                ("montant",       models.DecimalField(decimal_places=2, max_digits=12)),
                ("reference",     models.CharField(blank=True, max_length=100)),
                ("original_id",   models.IntegerField()),
                ("archive",   models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="paiements",      to="syndic.archivecomptable")),
                ("residence", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="archive_paiements", to="syndic.residence")),
                ("lot",       models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="archive_paiements", to="syndic.lot")),
            ],
            options={"ordering": ["-date_paiement"]},
        ),
        # ArchiveRecette
        migrations.CreateModel(
            name="ArchiveRecette",
            fields=[
                ("id",           models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("date_recette", models.DateField()),
                ("montant",      models.DecimalField(decimal_places=2, max_digits=12)),
                ("libelle",      models.CharField(max_length=200)),
                ("source",       models.CharField(blank=True, max_length=200)),
                ("commentaire",  models.TextField(blank=True)),
                ("original_id",  models.IntegerField()),
                ("archive",   models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recettes", to="syndic.archivecomptable")),
                ("residence", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="archive_recettes", to="syndic.residence")),
                ("compte",    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="archive_recettes", to="syndic.comptecomptable")),
            ],
            options={"ordering": ["-date_recette"]},
        ),
    ]
