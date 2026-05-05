import django.db.models.deletion
from django.db import migrations, models


def merge_threads_per_pair(apps, schema_editor):
    ChatThread = apps.get_model('chat', 'ChatThread')
    ChatMessage = apps.get_model('chat', 'ChatMessage')
    VacancyProposal = apps.get_model('proposals', 'VacancyProposal')

    # Eski sxemadagi one-to-one bog'lanishni yangi FK maydonga ko'chiramiz.
    for thread in ChatThread.objects.all().iterator():
        proposal_id = getattr(thread, 'proposal_id', None)
        if proposal_id:
            VacancyProposal.objects.filter(
                id=proposal_id,
                chat_thread_id__isnull=True,
            ).update(chat_thread_id=thread.id)

    # Bir xil client-worker juftligidagi chatlarni bitta threadda birlashtiramiz.
    kept_by_pair = {}
    ordered_ids = list(
        ChatThread.objects.order_by('client_id', 'worker_id', '-updated_at', '-id').values_list('id', flat=True)
    )
    for thread_id in ordered_ids:
        thread = ChatThread.objects.filter(id=thread_id).first()
        if thread is None:
            continue
        key = (thread.client_id, thread.worker_id)
        kept_thread = kept_by_pair.get(key)
        if kept_thread is None:
            kept_by_pair[key] = thread
            continue

        VacancyProposal.objects.filter(chat_thread_id=thread.id).update(chat_thread_id=kept_thread.id)
        ChatMessage.objects.filter(thread_id=thread.id).update(thread_id=kept_thread.id)

        if thread.vacancy_id and kept_thread.vacancy_id != thread.vacancy_id:
            ChatThread.objects.filter(id=kept_thread.id).update(vacancy_id=thread.vacancy_id)

        thread.delete()

    # Threadning vacancy ko'rsatkichi oxirgi murojaatdagi e'longa teng bo'lsin.
    for thread in ChatThread.objects.all().iterator():
        latest_proposal = (
            VacancyProposal.objects
            .filter(chat_thread_id=thread.id)
            .order_by('-created_at', '-id')
            .first()
        )
        if latest_proposal and latest_proposal.vacancy_id != thread.vacancy_id:
            ChatThread.objects.filter(id=thread.id).update(vacancy_id=latest_proposal.vacancy_id)


def ensure_unique_pairs_before_constraint(apps, schema_editor):
    """
    SQLite'da AddConstraint paytida jadval qayta yaratiladi.
    Shu bosqichdan oldin ham dublikat juftliklar qolmaganini qat'iy tekshiramiz.
    """
    ChatThread = apps.get_model('chat', 'ChatThread')
    ChatMessage = apps.get_model('chat', 'ChatMessage')
    VacancyProposal = apps.get_model('proposals', 'VacancyProposal')

    keep_by_pair = {}
    rows = list(
        ChatThread.objects
        .order_by('client_id', 'worker_id', '-updated_at', '-id')
        .values('id', 'client_id', 'worker_id', 'vacancy_id')
    )
    for row in rows:
        pair_key = (row['client_id'], row['worker_id'])
        keep_id = keep_by_pair.get(pair_key)
        if keep_id is None:
            keep_by_pair[pair_key] = row['id']
            continue

        duplicate_id = row['id']
        VacancyProposal.objects.filter(chat_thread_id=duplicate_id).update(chat_thread_id=keep_id)
        ChatMessage.objects.filter(thread_id=duplicate_id).update(thread_id=keep_id)

        keep_thread = ChatThread.objects.filter(id=keep_id).first()
        if keep_thread and (not keep_thread.vacancy_id) and row['vacancy_id']:
            ChatThread.objects.filter(id=keep_id).update(vacancy_id=row['vacancy_id'])

        ChatThread.objects.filter(id=duplicate_id).delete()


def noop_reverse(apps, schema_editor):
    # Oldingi sxemaga avtomatik qaytarish imkoni yo'q.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0003_chatmessage_delivery_and_read_fields'),
        ('proposals', '0002_vacancyproposal_chat_thread'),
    ]

    operations = [
        migrations.RunPython(merge_threads_per_pair, noop_reverse),
        migrations.RemoveField(
            model_name='chatthread',
            name='proposal',
        ),
        migrations.AlterField(
            model_name='chatthread',
            name='vacancy',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='chat_threads',
                to='jobs.joborder',
            ),
        ),
        migrations.RunPython(ensure_unique_pairs_before_constraint, noop_reverse),
        migrations.AddConstraint(
            model_name='chatthread',
            constraint=models.UniqueConstraint(
                fields=('client', 'worker'),
                name='unique_client_worker_chat_thread',
            ),
        ),
    ]
