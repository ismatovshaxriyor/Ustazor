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
        self.assertEqual(closed_response.status_code, status.HTTP_404_NOT_FOUND)
