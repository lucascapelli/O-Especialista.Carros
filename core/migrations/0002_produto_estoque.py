# Generated by Django 5.2.2 on 2025-06-15 13:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='produto',
            name='estoque',
            field=models.IntegerField(default=0),
        ),
    ]
