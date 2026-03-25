from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("syndic", "0051_ai_module"),
    ]

    operations = [
        migrations.AlterField(
            model_name="aiconfig",
            name="residence",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="ai_config",
                to="syndic.residence",
            ),
        ),
    ]
