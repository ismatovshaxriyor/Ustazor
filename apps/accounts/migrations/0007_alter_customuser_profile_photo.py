from django.db import migrations, models
from django.db.models import Q


def clear_missing_default_profile_photo(apps, schema_editor):
    CustomUser = apps.get_model('accounts', 'CustomUser')
    defaults_q = (
        Q(profile_photo__iendswith='default_user.png')
        | Q(profile_photo__iendswith='default_client.png')
        | Q(profile_photo__iendswith='default_worker.png')
    )
    CustomUser.objects.filter(defaults_q).update(profile_photo=None)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_alter_workerskill_options'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='profile_photo',
            field=models.ImageField(blank=True, null=True, upload_to='media/profile_photos/'),
        ),
        migrations.RunPython(clear_missing_default_profile_photo, migrations.RunPython.noop),
    ]
