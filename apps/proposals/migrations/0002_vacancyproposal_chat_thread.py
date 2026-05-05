from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0003_chatmessage_delivery_and_read_fields'),
        ('proposals', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='vacancyproposal',
            name='chat_thread',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='proposals',
                to='chat.chatthread',
            ),
        ),
    ]
