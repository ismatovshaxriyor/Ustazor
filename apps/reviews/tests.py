from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import USER_TYPE_CHOICES
from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES, PRICE_TYPE_CHOICES
from apps.reviews.models import WorkerPortfolio, WorkerReview

User = get_user_model()


def generate_test_image(filename='test.png', color=(33, 150, 243)):
    buffer = BytesIO()
    image = Image.new('RGB', (32, 32), color=color)
    image.save(buffer, format='PNG')
    buffer.seek(0)
    return SimpleUploadedFile(filename, buffer.read(), content_type='image/png')


class ReviewsApiTests(APITestCase):
    def setUp(self):
        self.password = 'StrongPass123'
        self.client_user = User.objects.create_user(
            email='review-client@example.com',
            phone_number='+998901556677',
            full_name='Review Mijoz',
            user_type=USER_TYPE_CHOICES.client,
            is_active=True,
            is_verified=True,
            password=self.password,
        )
        self.worker_user = User.objects.create_user(
            email='review-worker@example.com',
            phone_number='+998902667788',
            full_name='Review Usta',
            user_type=USER_TYPE_CHOICES.worker,
            is_active=True,
            is_verified=True,
            password=self.password,
        )
        self.order = JobOrder.objects.create(
            client=self.client_user,
            assigned_worker=self.worker_user,
            title='Bo`yoq ishlari',
            description='2 xonali uyga bo`yoq qilish kerak.',
            city='Toshkent',
            price_type=PRICE_TYPE_CHOICES.negotiable,
            status=ORDER_STATUS_CHOICES.completed,
        )

    def test_client_can_create_review_with_images(self):
        self.client.force_authenticate(user=self.client_user)
        image_1 = generate_test_image('review-1.png')
        image_2 = generate_test_image('review-2.png', color=(255, 193, 7))

        response = self.client.post(
            reverse('order_review_create', kwargs={'order_id': self.order.id}),
            {
                'rating': 5,
                'comment': 'Ish sifati juda yaxshi, vaqtida tugatdi.',
                'images': [image_1, image_2],
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rating'], 5)
        self.assertEqual(len(response.data['images']), 2)
        self.assertEqual(WorkerReview.objects.count(), 1)

    def test_client_cannot_create_review_for_not_completed_order(self):
        self.order.status = ORDER_STATUS_CHOICES.in_progress
        self.order.save(update_fields=['status'])

        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(
            reverse('order_review_create', kwargs={'order_id': self.order.id}),
            {
                'rating': 4,
                'comment': 'Test',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('yakunlangan', str(response.data))

    def test_worker_portfolio_crud_and_public_list(self):
        self.client.force_authenticate(user=self.worker_user)
        create_response = self.client.post(
            reverse('my_portfolio_list_create'),
            {
                'title': 'Ofis mebeli yig`ish',
                'description': 'Stol va shkaflar yig`ildi.',
                'location': 'Samarqand',
                'images': [generate_test_image('portfolio-1.png')],
            },
            format='multipart',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        item_id = create_response.data['id']

        list_response = self.client.get(reverse('my_portfolio_list_create'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data['results']), 1)

        self.client.force_authenticate(user=None)
        public_response = self.client.get(
            reverse('public_worker_portfolio', kwargs={'worker_id': self.worker_user.id}),
        )
        self.assertEqual(public_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(public_response.data['results']), 1)

        self.client.force_authenticate(user=self.worker_user)
        delete_response = self.client.delete(
            reverse('my_portfolio_detail', kwargs={'pk': item_id}),
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(WorkerPortfolio.objects.count(), 0)
