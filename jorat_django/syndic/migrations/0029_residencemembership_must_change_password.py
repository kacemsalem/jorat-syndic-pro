from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('syndic', '0028_resident_portal'),
    ]

    operations = [
        migrations.AddField(
            model_name='residencemembership',
            name='must_change_password',
            field=models.BooleanField(default=False),
        ),
    ]
