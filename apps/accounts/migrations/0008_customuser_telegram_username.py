from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_alter_customuser_profile_photo'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='telegram_username',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
    ]
