from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import USER_TYPE_CHOICES
from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES, PRICE_TYPE_CHOICES

User = get_user_model()


class JobOrderApiTests(APITestCase):
    def setUp(self):
        self.password = 'StrongPass123'
        self.client_user = User.objects.create_user(
            email='client@example.com',
            phone_number='+998901111111',
            secondary_phone_number='+998901111122',
            telegram_username='client_support',
            instagram_username='client_insta',
            full_name='Client User',
            user_type=USER_TYPE_CHOICES.client,
            is_active=True,
            is_verified=True,
            password=self.password,
        )
        self.other_client_user = User.objects.create_user(
            email='client2@example.com',
            phone_number='+998902222222',
            full_name='Client Two',
            user_type=USER_TYPE_CHOICES.client,
            is_active=True,
            is_verified=True,
            password=self.password,
        )
        self.worker_user = User.objects.create_user(
            email='worker-orders@example.com',
            phone_number='+998903333333',
            full_name='Worker Orders',
            user_type=USER_TYPE_CHOICES.worker,
            is_active=True,
            is_verified=True,
            password=self.password,
        )

        self.client.force_authenticate(user=self.client_user)

    def test_create_order_negotiable_without_price(self):
        payload = {
            'title': 'Santexnik kerak',
            'description': 'Issiq suv quvuri nosoz.',
            'category': 'Santexnika',
            'city': 'Toshkent',
            'price_type': PRICE_TYPE_CHOICES.negotiable,
        }
        response = self.client.post(reverse('order_list_create'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['price_amount'])
        self.assertEqual(response.data['price_type'], PRICE_TYPE_CHOICES.negotiable)

    def test_worker_can_create_order(self):
        self.client.force_authenticate(user=self.worker_user)
        payload = {
            'title': 'Elektrik kerak',
            'description': 'Uydagi elektr panelni yangilash kerak.',
            'category': 'Elektrik',
            'city': 'Samarqand',
            'price_type': PRICE_TYPE_CHOICES.negotiable,
        }

        response = self.client.post(reverse('order_list_create'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['client'], self.worker_user.id)

    def test_create_order_fixed_requires_price_amount(self):
        payload = {
            'title': 'Elektrik ish',
            'description': 'Rozetkalarni almashtirish',
            'price_type': PRICE_TYPE_CHOICES.fixed,
        }
        response = self.client.post(reverse('order_list_create'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price_amount', response.data)

    def test_create_order_fixed_with_price(self):
        payload = {
            'title': 'Malyar ish',
            'description': '2 xonali kvartira bo`yash',
            'price_type': PRICE_TYPE_CHOICES.fixed,
            'price_amount': '2500000.00',
        }
        response = self.client.post(reverse('order_list_create'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['price_type'], PRICE_TYPE_CHOICES.fixed)
        self.assertEqual(response.data['price_amount'], '2500000.00')

    def test_list_only_returns_current_user_orders(self):
        JobOrder.objects.create(
            client=self.client_user,
            title='Mening buyurtmam',
            description='Test',
            price_type=PRICE_TYPE_CHOICES.negotiable,
        )
        JobOrder.objects.create(
            client=self.other_client_user,
            title='Boshqa user buyurtmasi',
            description='Test',
            price_type=PRICE_TYPE_CHOICES.negotiable,
        )

        response = self.client.get(reverse('order_list_create'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Mening buyurtmam')

    def test_status_filter_works(self):
        JobOrder.objects.create(
            client=self.client_user,
            title='Yangi',
            description='Test',
            status=ORDER_STATUS_CHOICES.open,
            price_type=PRICE_TYPE_CHOICES.negotiable,
        )
        JobOrder.objects.create(
            client=self.client_user,
            title='Yakunlangan',
            description='Test',
            status=ORDER_STATUS_CHOICES.completed,
            price_type=PRICE_TYPE_CHOICES.negotiable,
        )

        response = self.client.get(f"{reverse('order_list_create')}?status={ORDER_STATUS_CHOICES.completed}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['status'], ORDER_STATUS_CHOICES.completed)

    def test_client_can_close_in_progress_order_with_assigned_worker(self):
        order = JobOrder.objects.create(
            client=self.client_user,
            assigned_worker=self.worker_user,
            title='Jarayondagi ish',
            description='Test',
            status=ORDER_STATUS_CHOICES.in_progress,
            price_type=PRICE_TYPE_CHOICES.negotiable,
        )

        response = self.client.post(reverse('order_close', kwargs={'pk': order.id}), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ORDER_STATUS_CHOICES.completed)
        self.assertEqual(response.data['assigned_worker_name'], self.worker_user.full_name)

    def test_client_cannot_close_order_without_assigned_worker(self):
        order = JobOrder.objects.create(
            client=self.client_user,
            title='Ustasiz ish',
            description='Test',
            status=ORDER_STATUS_CHOICES.open,
            price_type=PRICE_TYPE_CHOICES.negotiable,
        )

        response = self.client.post(reverse('order_close', kwargs={'pk': order.id}), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_access_other_user_order(self):
        other_order = JobOrder.objects.create(
            client=self.other_client_user,
            title='Boshqa user buyurtmasi',
            description='Test',
            price_type=PRICE_TYPE_CHOICES.negotiable,
        )

        response = self.client.get(reverse('order_detail', kwargs={'pk': other_order.id}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_vacancy_list_returns_only_open_orders_and_filters(self):
        JobOrder.objects.create(
            client=self.client_user,
            title='Elektrik kerak',
            description='Kvartirada elektr sim tortish',
            category='Elektrik',
            city='Toshkent',
            price_type=PRICE_TYPE_CHOICES.negotiable,
            status=ORDER_STATUS_CHOICES.open,
        )
        JobOrder.objects.create(
            client=self.client_user,
            title='Yakunlangan buyurtma',
            description='Ko`rinmasin',
            category='Malyar',
            city='Buxoro',
            price_type=PRICE_TYPE_CHOICES.fixed,
            price_amount='1500000.00',
            status=ORDER_STATUS_CHOICES.completed,
        )

        self.client.force_authenticate(user=None)
        response = self.client.get(f"{reverse('public_vacancy_list')}?q=elektr&city=toshkent")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Elektrik kerak')
        self.assertEqual(response.data['results'][0]['status'], ORDER_STATUS_CHOICES.open)

    def test_public_vacancy_list_for_client_shows_only_own_orders(self):
        own_open = JobOrder.objects.create(
            client=self.client_user,
            title='Mening ochiq buyurtmam',
            description='Test',
            price_type=PRICE_TYPE_CHOICES.negotiable,
            status=ORDER_STATUS_CHOICES.open,
        )
        own_closed = JobOrder.objects.create(
            client=self.client_user,
            title='Mening yopiq buyurtmam',
            description='Test',
            price_type=PRICE_TYPE_CHOICES.negotiable,
            status=ORDER_STATUS_CHOICES.completed,
        )
        other_open = JobOrder.objects.create(
            client=self.other_client_user,
            title='Boshqaning ochiq buyurtmasi',
            description='Test',
            price_type=PRICE_TYPE_CHOICES.negotiable,
            status=ORDER_STATUS_CHOICES.open,
        )

        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(reverse('public_vacancy_list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        result_ids = {item['id'] for item in response.data['results']}
        self.assertIn(own_open.id, result_ids)
        self.assertIn(own_closed.id, result_ids)
        self.assertNotIn(other_open.id, result_ids)

    def test_public_vacancy_detail_hides_non_open_orders(self):
        open_order = JobOrder.objects.create(
            client=self.client_user,
            title='Ochiq buyurtma',
            description='Test',
            price_type=PRICE_TYPE_CHOICES.negotiable,
            status=ORDER_STATUS_CHOICES.open,
        )
        closed_order = JobOrder.objects.create(
            client=self.client_user,
            title='Yopiq buyurtma',
            description='Test',
            price_type=PRICE_TYPE_CHOICES.negotiable,
            status=ORDER_STATUS_CHOICES.completed,
        )

        self.client.force_authenticate(user=None)
        open_response = self.client.get(reverse('public_vacancy_detail', kwargs={'pk': open_order.id}))
        closed_response = self.client.get(reverse('public_vacancy_detail', kwargs={'pk': closed_order.id}))

        self.assertEqual(open_response.status_code, status.HTTP_200_OK)
        self.assertEqual(open_response.data.get('client_email'), 'client@example.com')
        self.assertEqual(open_response.data.get('client_phone_number'), '+998901111111')
        self.assertEqual(open_response.data.get('client_secondary_phone_number'), '+998901111122')
        self.assertEqual(open_response.data.get('client_telegram_username'), 'client_support')
        self.assertEqual(open_response.data.get('client_instagram_username'), 'client_insta')
        self.assertEqual(closed_response.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(user=self.client_user)
        owner_response = self.client.get(reverse('public_vacancy_detail', kwargs={'pk': closed_order.id}))
        self.assertEqual(owner_response.status_code, status.HTTP_200_OK)

        closed_order.assigned_worker = self.worker_user
        closed_order.save(update_fields=['assigned_worker', 'updated_at'])

        self.client.force_authenticate(user=self.worker_user)
        worker_response = self.client.get(reverse('public_vacancy_detail', kwargs={'pk': closed_order.id}))
        self.assertEqual(worker_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.other_client_user)
        stranger_response = self.client.get(reverse('public_vacancy_detail', kwargs={'pk': closed_order.id}))
        self.assertEqual(stranger_response.status_code, status.HTTP_404_NOT_FOUND)
