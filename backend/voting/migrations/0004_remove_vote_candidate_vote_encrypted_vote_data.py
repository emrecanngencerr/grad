# Generated by Django 5.2.1 on 2025-06-13 17:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('voting', '0003_remove_vote_encrypted_vote_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='vote',
            name='candidate',
        ),
        migrations.AddField(
            model_name='vote',
            name='encrypted_vote_data',
            field=models.TextField(default=' '),
            preserve_default=False,
        ),
    ]
