from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import USER_TYPE_CHOICES
from apps.chat.models import ChatMessage, ChatThread
from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES, PRICE_TYPE_CHOICES
from apps.proposals.models import PROPOSAL_STATUS_CHOICES, VacancyProposal

User = get_user_model()


class ChatApiTests(APITestCase):
    def setUp(self):
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
        self.vacancy = JobOrder.objects.create(
            client=self.client_user,
            title='Santexnik kerak',
            description='Issiq suv quvurini ta`mirlash kerak',
            category='Santexnik',
            city='Buxoro',
            price_type=PRICE_TYPE_CHOICES.negotiable,
            status=ORDER_STATUS_CHOICES.open,
        )

    def _create_proposal_via_api(self):
        self.client.force_authenticate(user=self.worker_user)
        response = self.client.post(
            reverse('vacancy_apply', kwargs={'vacancy_id': self.vacancy.id}),
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
        thread = ChatThread.objects.get(proposal=proposal)

        self.assertEqual(response.data['chat_thread_id'], thread.id)
        self.assertEqual(thread.client_id, self.client_user.id)
        self.assertEqual(thread.worker_id, self.worker_user.id)
        self.assertEqual(thread.vacancy_id, self.vacancy.id)

        initial_message = ChatMessage.objects.filter(thread=thread).first()
        self.assertIsNotNone(initial_message)
        self.assertEqual(initial_message.sender_id, self.worker_user.id)

    def test_thread_list_and_message_send(self):
        response = self._create_proposal_via_api()
        thread_id = response.data['chat_thread_id']

        self.client.force_authenticate(user=self.client_user)
        list_response = self.client.get(reverse('chat_thread_list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data['results']), 1)
        self.assertEqual(list_response.data['results'][0]['id'], thread_id)

        send_response = self.client.post(
            reverse('chat_message_list_create', kwargs={'thread_id': thread_id}),
            {'body': 'Qachon kela olasiz?'},
            format='json',
        )
        self.assertEqual(send_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(send_response.data['sender_id'], self.client_user.id)

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
            all(item['body'] != "Mijoz sizni ushbu e`lon uchun qabul qildi." for item in client_messages.data['results'])
        )

        self.client.force_authenticate(user=self.worker_user)
        worker_messages = self.client.get(
            reverse('chat_message_list_create', kwargs={'thread_id': thread_id}),
        )
        self.assertEqual(worker_messages.status_code, status.HTTP_200_OK)
        self.assertTrue(
            any(item['body'] == "Mijoz sizni ushbu e`lon uchun qabul qildi." for item in worker_messages.data['results'])
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
