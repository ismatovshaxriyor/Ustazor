from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0002_chatmessage_visibility'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatmessage',
            name='delivered_to_client_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='delivered_to_worker_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='read_by_client_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='read_by_worker_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
