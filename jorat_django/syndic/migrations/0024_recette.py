from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('syndic', '0023_caissemouvement'),
    ]

    operations = [
        # 1. Create Recette table
        migrations.CreateModel(
            name='Recette',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('date_recette', models.DateField(default=django.utils.timezone.now)),
                ('montant', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('libelle', models.CharField(max_length=200)),
                ('source', models.CharField(blank=True, max_length=200)),
                ('commentaire', models.TextField(blank=True)),
                ('residence', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recettes', to='syndic.residence')),
                ('compte', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='recettes', to='syndic.comptecomptable')),
            ],
            options={
                'ordering': ['-date_recette', '-created_at'],
            },
        ),
        # 2. Add recette FK to CaisseMouvement
        migrations.AddField(
            model_name='caissemouvement',
            name='recette',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='mouvement_caisse', to='syndic.recette'),
        ),
        # 3. Update TYPE_CHOICES (DB-level: no schema change needed, just choices)
        migrations.AlterField(
            model_name='caissemouvement',
            name='type_mouvement',
            field=models.CharField(choices=[('SOLDE_INITIAL', 'Solde initial'), ('PAIEMENT', 'Paiement copropriétaire'), ('RECETTE', 'Recette'), ('DEPENSE', 'Dépense'), ('AJUSTEMENT', 'Ajustement')], max_length=20),
        ),
    ]
