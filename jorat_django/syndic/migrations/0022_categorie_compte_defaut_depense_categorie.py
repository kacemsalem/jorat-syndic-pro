from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('syndic', '0021_comptecomptable'),
    ]

    operations = [
        # 1. Add compte_defaut to CategorieDepense
        migrations.AddField(
            model_name='categoriedepense',
            name='compte_defaut',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='categories_defaut',
                to='syndic.comptecomptable',
                verbose_name='Compte comptable par défaut',
            ),
        ),

        # 2. Add categorie back to Depense (nullable — optional field)
        migrations.AddField(
            model_name='depense',
            name='categorie',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='depenses',
                to='syndic.categoriedepense',
            ),
        ),
    ]
