# Generated by Django 5.2.1 on 2025-06-21 14:10

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('voting', '0007_votecommitment'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='election',
            name='eligible_voters',
        ),
    ]
