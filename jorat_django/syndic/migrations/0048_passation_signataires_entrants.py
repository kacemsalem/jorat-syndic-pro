from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('syndic', '0047_passation_consignes'),
    ]

    operations = [
        migrations.AddField(
            model_name='passationconsignes',
            name='nom_syndic_entrant',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name='passationconsignes',
            name='nom_tresorier_entrant',
            field=models.CharField(blank=True, max_length=150),
        ),
    ]
