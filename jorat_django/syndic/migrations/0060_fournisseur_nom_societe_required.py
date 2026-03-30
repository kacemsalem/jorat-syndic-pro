from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0059_assemblee_statut_pas_de_retour"),
    ]

    operations = [
        # Remplir nom_societe avec nom pour les lignes sans société
        migrations.RunSQL(
            "UPDATE syndic_fournisseur SET nom_societe = nom WHERE nom_societe = '' OR nom_societe IS NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Rendre nom optionnel
        migrations.AlterField(
            model_name="fournisseur",
            name="nom",
            field=models.CharField(blank=True, max_length=150, verbose_name="Nom contact"),
        ),
        # Rendre nom_societe obligatoire
        migrations.AlterField(
            model_name="fournisseur",
            name="nom_societe",
            field=models.CharField(max_length=200, verbose_name="Nom société"),
        ),
        # Supprimer l'ancienne contrainte unique sur nom
        migrations.RemoveConstraint(
            model_name="fournisseur",
            name="uniq_fournisseur_nom_par_residence",
        ),
        # Ajouter la nouvelle contrainte unique sur nom_societe
        migrations.AddConstraint(
            model_name="fournisseur",
            constraint=models.UniqueConstraint(
                fields=["residence", "nom_societe"],
                name="uniq_fournisseur_nom_societe_par_residence",
            ),
        ),
    ]
