from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatmessage',
            name='visibility',
            field=models.CharField(
                choices=[
                    ('all', 'Hamma uchun'),
                    ('client_only', 'Faqat mijoz'),
                    ('worker_only', 'Faqat usta'),
                ],
                default='all',
                max_length=20,
            ),
        ),
    ]
