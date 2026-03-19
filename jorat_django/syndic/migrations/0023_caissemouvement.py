from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('syndic', '0022_categorie_compte_defaut_depense_categorie'),
    ]

    operations = [
        migrations.CreateModel(
            name='CaisseMouvement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('date_mouvement', models.DateField(default=django.utils.timezone.now)),
                ('type_mouvement', models.CharField(choices=[('SOLDE_INITIAL', 'Solde initial'), ('PAIEMENT', 'Paiement copropriétaire'), ('DEPENSE', 'Dépense'), ('AJUSTEMENT', 'Ajustement')], max_length=20)),
                ('sens', models.CharField(choices=[('DEBIT', 'Entrée'), ('CREDIT', 'Sortie')], max_length=10)),
                ('montant', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('libelle', models.CharField(max_length=200)),
                ('commentaire', models.TextField(blank=True)),
                ('residence', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='caisse_mouvements', to='syndic.residence')),
                ('paiement', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='mouvement_caisse', to='syndic.paiement')),
                ('depense', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='mouvement_caisse', to='syndic.depense')),
            ],
            options={
                'ordering': ['-date_mouvement', '-id'],
            },
        ),
    ]
