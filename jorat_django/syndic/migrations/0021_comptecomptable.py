from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('syndic', '0020_fournisseur_nom_societe'),
    ]

    operations = [
        # 1. Create CompteComptable
        migrations.CreateModel(
            name='CompteComptable',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('code', models.CharField(max_length=10, verbose_name='Code')),
                ('libelle', models.CharField(max_length=200, verbose_name='Libellé')),
                ('actif', models.BooleanField(default=True)),
                ('residence', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comptes_comptables', to='syndic.residence')),
            ],
            options={
                'ordering': ['code'],
            },
        ),
        migrations.AddConstraint(
            model_name='comptecomptable',
            constraint=models.UniqueConstraint(fields=['residence', 'code'], name='uniq_compte_code_par_residence'),
        ),

        # 2. Add compte (nullable) to Depense
        migrations.AddField(
            model_name='depense',
            name='compte',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='depenses',
                to='syndic.comptecomptable',
            ),
        ),

        # 3. Delete existing depenses (no compte assigned yet — dev data only)
        migrations.RunSQL("DELETE FROM syndic_depense;", migrations.RunSQL.noop),

        # 4. Remove categorie from Depense
        migrations.RemoveField(
            model_name='depense',
            name='categorie',
        ),

        # 5. Make compte non-nullable
        migrations.AlterField(
            model_name='depense',
            name='compte',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='depenses',
                to='syndic.comptecomptable',
            ),
        ),
    ]
