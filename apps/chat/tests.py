import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import USER_TYPE_CHOICES
from apps.accounts.models import WorkerProfile
from apps.chat.models import ChatMessage, ChatThread
from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES, PRICE_TYPE_CHOICES
from apps.proposals.models import PROPOSAL_STATUS_CHOICES, VacancyProposal

User = get_user_model()


class ChatApiTests(APITestCase):
    def setUp(self):
        self.temp_media_dir = tempfile.mkdtemp(prefix='ustazor-chat-test-media-')
        self.media_override = override_settings(MEDIA_ROOT=self.temp_media_dir, MEDIA_URL='/media/')
        self.media_override.enable()

        self.password = 'StrongPass123'
        self.client_user = User.objects.create_user(
            email='chat-client@example.com',
            phone_number='+998901110000',
            full_name='Chat Mijoz',
            user_type=USER_TYPE_CHOICES.client,
            is_active=True,
            is_verified=True,
            password=self.password,
        )
        self.worker_user = User.objects.create_user(
            email='chat-worker@example.com',
            phone_number='+998902220000',
            full_name='Chat Usta',
            user_type=USER_TYPE_CHOICES.worker,
            is_active=True,
            is_verified=True,
            password=self.password,
        )
        WorkerProfile.objects.create(user=self.worker_user)
        self.vacancy = JobOrder.objects.create(
            client=self.client_user,
            title='Santexnik kerak',
            description='Issiq suv quvurini ta`mirlash kerak',
            category='Santexnik',
            city='Buxoro',
            price_type=PRICE_TYPE_CHOICES.negotiable,
            status=ORDER_STATUS_CHOICES.open,
        )
        self.second_vacancy = JobOrder.objects.create(
            client=self.client_user,
            title='Elektrik kerak',
            description='Kvartira uchun elektr ta`mir kerak',
            category='Elektrik',
            city='Buxoro',
            price_type=PRICE_TYPE_CHOICES.fixed,
            price_amount='1200000.00',
            status=ORDER_STATUS_CHOICES.open,
        )

    def tearDown(self):
        self.media_override.disable()
        shutil.rmtree(self.temp_media_dir, ignore_errors=True)
        super().tearDown()

    def _create_proposal_via_api(self, vacancy_id=None):
        self.client.force_authenticate(user=self.worker_user)
        response = self.client.post(
            reverse('vacancy_apply', kwargs={'vacancy_id': vacancy_id or self.vacancy.id}),
            {
                'cover_letter': 'Salom, bu ishni qilib beraman.',
                'proposed_price': '800000.00',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def test_apply_creates_chat_thread_and_initial_message(self):
        response = self._create_proposal_via_api()
        proposal = VacancyProposal.objects.get(pk=response.data['id'])
        thread = ChatThread.objects.get(pk=proposal.chat_thread_id)

        self.assertEqual(response.data['chat_thread_id'], thread.id)
        self.assertEqual(thread.client_id, self.client_user.id)
        self.assertEqual(thread.worker_id, self.worker_user.id)
        self.assertEqual(thread.vacancy_id, self.vacancy.id)

        initial_message = ChatMessage.objects.filter(thread=thread).first()
        self.assertIsNotNone(initial_message)
        self.assertEqual(initial_message.sender_id, self.worker_user.id)
        self.assertIn("E`lon: Santexnik kerak", initial_message.body)

    def test_second_apply_creates_separate_thread_per_vacancy(self):
        first = self._create_proposal_via_api(vacancy_id=self.vacancy.id)
        second = self._create_proposal_via_api(vacancy_id=self.second_vacancy.id)

        first_proposal = VacancyProposal.objects.get(pk=first.data['id'])
        second_proposal = VacancyProposal.objects.get(pk=second.data['id'])

        self.assertNotEqual(first.data['chat_thread_id'], second.data['chat_thread_id'])
        self.assertNotEqual(first_proposal.chat_thread_id, second_proposal.chat_thread_id)
        self.assertEqual(ChatThread.objects.count(), 2)

        first_thread = ChatThread.objects.get(pk=first_proposal.chat_thread_id)
        second_thread = ChatThread.objects.get(pk=second_proposal.chat_thread_id)
        self.assertEqual(first_thread.vacancy_id, self.vacancy.id)
        self.assertEqual(second_thread.vacancy_id, self.second_vacancy.id)

        self.client.force_authenticate(user=self.client_user)
        list_response = self.client.get(reverse('chat_thread_list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data['results']), 2)
        for item in list_response.data['results']:
            self.assertEqual(len(item['proposal_options']), 1)

        vacancy_titles = {item['vacancy_title'] for item in list_response.data['results']}
        self.assertIn('Santexnik kerak', vacancy_titles)
        self.assertIn('Elektrik kerak', vacancy_titles)

    def test_thread_list_and_message_send(self):
        response = self._create_proposal_via_api()
        thread_id = response.data['chat_thread_id']

        self.client.force_authenticate(user=self.client_user)
        list_response = self.client.get(reverse('chat_thread_list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data['results']), 1)
        self.assertEqual(list_response.data['results'][0]['id'], thread_id)
        self.assertIsNotNone(list_response.data['results'][0]['other_user_worker_profile_id'])

        send_response = self.client.post(
            reverse('chat_message_list_create', kwargs={'thread_id': thread_id}),
            {'body': 'Qachon kela olasiz?'},
            format='json',
        )
        self.assertEqual(send_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(send_response.data['sender_id'], self.client_user.id)

    def test_thread_message_send_supports_file_attachment(self):
        response = self._create_proposal_via_api()
        thread_id = response.data['chat_thread_id']

        self.client.force_authenticate(user=self.client_user)
        sent_file = SimpleUploadedFile(
            'sample.txt',
            b'chat file payload',
            content_type='text/plain',
        )
        send_response = self.client.post(
            reverse('chat_message_list_create', kwargs={'thread_id': thread_id}),
            {
                'body': '',
                'attachment': sent_file,
            },
            format='multipart',
        )

        self.assertEqual(send_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(send_response.data['sender_id'], self.client_user.id)
        self.assertTrue(send_response.data['attachment_url'])
        self.assertEqual(send_response.data['attachment_name'], 'sample.txt')

        saved_message = ChatMessage.objects.get(pk=send_response.data['id'])
        self.assertTrue(bool(saved_message.attachment))

    def test_chat_profile_link_data_created_when_worker_profile_missing(self):
        WorkerProfile.objects.filter(user=self.worker_user).delete()
        self.assertFalse(WorkerProfile.objects.filter(user=self.worker_user).exists())

        response = self._create_proposal_via_api()
        thread_id = response.data['chat_thread_id']

        self.assertTrue(WorkerProfile.objects.filter(user=self.worker_user).exists())

        self.client.force_authenticate(user=self.client_user)
        list_response = self.client.get(reverse('chat_thread_list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data['results'][0]['id'], thread_id)
        self.assertIsNotNone(list_response.data['results'][0]['other_user_worker_profile_id'])

    def test_client_accepts_worker_inside_chat(self):
        response = self._create_proposal_via_api()
        thread_id = response.data['chat_thread_id']
        proposal_id = response.data['id']

        self.client.force_authenticate(user=self.client_user)
        accept_response = self.client.post(
            reverse('chat_accept_worker', kwargs={'thread_id': thread_id}),
            {},
            format='json',
        )
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

        proposal = VacancyProposal.objects.get(pk=proposal_id)
        self.vacancy.refresh_from_db()

        self.assertEqual(proposal.status, PROPOSAL_STATUS_CHOICES.accepted)
        self.assertEqual(self.vacancy.status, ORDER_STATUS_CHOICES.in_progress)
        self.assertEqual(self.vacancy.assigned_worker_id, self.worker_user.id)

        self.client.force_authenticate(user=self.client_user)
        client_messages = self.client.get(
            reverse('chat_message_list_create', kwargs={'thread_id': thread_id}),
        )
        self.assertEqual(client_messages.status_code, status.HTTP_200_OK)
        self.assertTrue(
            all("Mijoz sizni ushbu e`lon uchun qabul qildi." not in item['body'] for item in client_messages.data['results'])
        )

        self.client.force_authenticate(user=self.worker_user)
        worker_messages = self.client.get(
            reverse('chat_message_list_create', kwargs={'thread_id': thread_id}),
        )
        self.assertEqual(worker_messages.status_code, status.HTTP_200_OK)
        self.assertTrue(
            any("Mijoz sizni ushbu e`lon uchun qabul qildi." in item['body'] for item in worker_messages.data['results'])
        )

    def test_client_rejects_worker_inside_chat_and_worker_gets_system_message(self):
        response = self._create_proposal_via_api()
        thread_id = response.data['chat_thread_id']
        proposal_id = response.data['id']

        self.client.force_authenticate(user=self.client_user)
        reject_response = self.client.post(
            reverse('chat_reject_worker', kwargs={'thread_id': thread_id}),
            {},
            format='json',
        )
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)

        proposal = VacancyProposal.objects.get(pk=proposal_id)
        self.vacancy.refresh_from_db()

        self.assertEqual(proposal.status, PROPOSAL_STATUS_CHOICES.rejected)
        self.assertEqual(self.vacancy.status, ORDER_STATUS_CHOICES.open)
        self.assertIsNone(self.vacancy.assigned_worker_id)

        last_message = ChatMessage.objects.filter(thread_id=thread_id).order_by('-id').first()
        self.assertIsNotNone(last_message)
        self.assertTrue(last_message.is_system)
        self.assertIn('rad etdi', last_message.body)

    def test_mark_read_endpoint_sets_read_and_delivered_for_participant(self):
        response = self._create_proposal_via_api()
        thread_id = response.data['chat_thread_id']

        first_message = ChatMessage.objects.filter(thread_id=thread_id).first()
        self.assertIsNotNone(first_message)
        self.assertIsNone(first_message.read_by_client_at)

        self.client.force_authenticate(user=self.client_user)
        mark_read_response = self.client.post(
            reverse('chat_mark_read', kwargs={'thread_id': thread_id}),
            {},
            format='json',
        )
        self.assertEqual(mark_read_response.status_code, status.HTTP_200_OK)

        first_message.refresh_from_db()
        self.assertIsNotNone(first_message.delivered_to_client_at)
        self.assertIsNotNone(first_message.read_by_client_at)

    def test_message_list_returns_latest_messages_on_first_page(self):
        response = self._create_proposal_via_api()
        thread_id = response.data['chat_thread_id']
        thread = ChatThread.objects.get(pk=thread_id)

        # Pagination yoqilgan holatda birinchi sahifada eng yangi xabarlar chiqishi kerak.
        for index in range(60):
            ChatMessage.objects.create(
                thread=thread,
                sender=self.worker_user if index % 2 == 0 else self.client_user,
                body=f'message-{index}',
            )

        newest = ChatMessage.objects.filter(thread=thread).order_by('-id').first()
        self.assertIsNotNone(newest)

        self.client.force_authenticate(user=self.client_user)
        list_response = self.client.get(reverse('chat_message_list_create', kwargs={'thread_id': thread_id}))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        results = list_response.data.get('results', [])
        self.assertGreater(len(results), 0)
        self.assertEqual(results[0]['id'], newest.id)

    def test_client_can_start_direct_chat_with_worker(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(
            reverse('chat_thread_start'),
            {
                'worker_id': self.worker_user.id,
                'initial_message': 'Salom',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('thread_id', response.data)
        thread = ChatThread.objects.get(pk=response.data['thread_id'])
        self.assertEqual(thread.client_id, self.client_user.id)
        self.assertEqual(thread.worker_id, self.worker_user.id)
        self.assertIsNone(thread.vacancy_id)
        self.assertTrue(ChatMessage.objects.filter(thread=thread, body='Salom').exists())

    def test_non_client_cannot_start_direct_chat(self):
        self.client.force_authenticate(user=self.worker_user)
        response = self.client.post(
            reverse('chat_thread_start'),
            {'worker_id': self.worker_user.id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
