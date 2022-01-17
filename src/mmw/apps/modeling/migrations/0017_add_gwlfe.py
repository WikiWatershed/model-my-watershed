# -*- coding: utf-8 -*-
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0016_old_scenarios'),
    ]

    operations = [
        migrations.AlterField(
            model_name='project',
            name='model_package',
            field=models.CharField(help_text='Which model pack was chosen for this project', max_length=255, choices=[('tr-55', 'Site Storm Model'), ('gwlfe', 'Watershed Multi-Year Model')]),
        ),
    ]
