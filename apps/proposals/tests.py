from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import USER_TYPE_CHOICES
from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES, PRICE_TYPE_CHOICES
from apps.proposals.models import PROPOSAL_STATUS_CHOICES, VacancyProposal

User = get_user_model()


class VacancyProposalApiTests(APITestCase):
    def setUp(self):
        self.password = 'StrongPass123'
        self.client_user = User.objects.create_user(
            email='proposal-client@example.com',
            phone_number='+998901010101',
            full_name='Mijoz',
            user_type=USER_TYPE_CHOICES.client,
            is_active=True,
            is_verified=True,
            password=self.password,
        )
        self.worker_user = User.objects.create_user(
            email='proposal-worker@example.com',
            phone_number='+998902020202',
            full_name='Usta',
            user_type=USER_TYPE_CHOICES.worker,
            is_active=True,
            is_verified=True,
            password=self.password,
        )
        self.worker_two = User.objects.create_user(
            email='proposal-worker2@example.com',
            phone_number='+998903030303',
            full_name='Usta 2',
            user_type=USER_TYPE_CHOICES.worker,
            is_active=True,
            is_verified=True,
            password=self.password,
        )
        self.vacancy = JobOrder.objects.create(
            client=self.client_user,
            title='Elektrik kerak',
            description='Yangi uy uchun to`liq elektr montaj',
            category='Elektrik',
            city='Toshkent',
            price_type=PRICE_TYPE_CHOICES.negotiable,
            status=ORDER_STATUS_CHOICES.open,
        )

    def test_worker_can_apply_to_open_vacancy(self):
        self.client.force_authenticate(user=self.worker_user)
        payload = {
            'cover_letter': 'Bu ishni 3 kunda tugataman.',
            'proposed_price': '3500000.00',
        }

        response = self.client.post(
            reverse('vacancy_apply', kwargs={'vacancy_id': self.vacancy.id}),
            payload,
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], PROPOSAL_STATUS_CHOICES.pending)
        self.assertEqual(VacancyProposal.objects.count(), 1)

    def test_worker_cannot_apply_twice(self):
        VacancyProposal.objects.create(
            vacancy=self.vacancy,
            worker=self.worker_user,
            cover_letter='Birinchi murojaat',
        )
        self.client.force_authenticate(user=self.worker_user)

        response = self.client.post(
            reverse('vacancy_apply', kwargs={'vacancy_id': self.vacancy.id}),
            {'cover_letter': 'Yana bir marta'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('allaqachon', str(response.data).lower())

    def test_client_cannot_apply_to_vacancy(self):
        self.client.force_authenticate(user=self.client_user)

        response = self.client.post(
            reverse('vacancy_apply', kwargs={'vacancy_id': self.vacancy.id}),
            {'cover_letter': 'Noto`g`ri so`rov'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_my_proposals_returns_only_worker_items(self):
        VacancyProposal.objects.create(
            vacancy=self.vacancy,
            worker=self.worker_user,
            cover_letter='Mening murojaatim',
        )
        VacancyProposal.objects.create(
            vacancy=self.vacancy,
            worker=self.worker_two,
            cover_letter='Boshqa usta murojaati',
        )
        self.client.force_authenticate(user=self.worker_user)

        response = self.client.get(reverse('my_proposals'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['worker_name'], self.worker_user.full_name)

    def test_client_can_list_received_proposals_and_update_status(self):
        proposal = VacancyProposal.objects.create(
            vacancy=self.vacancy,
            worker=self.worker_user,
            cover_letter='Qabul qilsangiz bo`ladi',
        )
        second_proposal = VacancyProposal.objects.create(
            vacancy=self.vacancy,
            worker=self.worker_two,
            cover_letter='Ikkinchi usta murojaati',
        )
        self.client.force_authenticate(user=self.client_user)

        list_response = self.client.get(reverse('received_proposals'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data['results']), 2)

        patch_response = self.client.patch(
            reverse('proposal_status_update', kwargs={'pk': proposal.id}),
            {'status': PROPOSAL_STATUS_CHOICES.accepted},
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        proposal.refresh_from_db()
        second_proposal.refresh_from_db()
        self.vacancy.refresh_from_db()

        self.assertEqual(proposal.status, PROPOSAL_STATUS_CHOICES.accepted)
        self.assertEqual(second_proposal.status, PROPOSAL_STATUS_CHOICES.rejected)
        self.assertEqual(self.vacancy.status, ORDER_STATUS_CHOICES.in_progress)
        self.assertEqual(self.vacancy.assigned_worker_id, self.worker_user.id)
