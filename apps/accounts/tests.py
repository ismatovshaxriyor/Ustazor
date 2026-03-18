import re
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import USER_TYPE_CHOICES, WorkerProfile, WorkerSkill
from apps.accounts.services.activation import get_activation_payload

User = get_user_model()


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'accounts-auth-tests',
        }
    },
    ACTIVATION_CODE_LENGTH=5,
    ACTIVATION_CODE_EXPIRE_MINUTES=10,
    ACTIVATION_RESEND_COOLDOWN_SECONDS=60,
    ACTIVATION_MAX_ATTEMPTS=5,
)
class AuthApiTests(APITestCase):
    def setUp(self):
        self.temp_media_dir = tempfile.mkdtemp(prefix='ustazor-test-media-')
        self.media_override = override_settings(MEDIA_ROOT=self.temp_media_dir, MEDIA_URL='/media/')
        self.media_override.enable()

        cache.clear()
        mail.outbox = []

        self.password = 'StrongPass123'
        self.verified_user = User.objects.create_user(
            email='user@example.com',
            phone_number='+998901112233',
            full_name='Test User',
            user_type=USER_TYPE_CHOICES.client,
            is_active=True,
            is_verified=True,
            password=self.password,
        )

        self.unverified_user = User.objects.create_user(
            email='pending@example.com',
            phone_number='+998907771122',
            full_name='Pending User',
            user_type=USER_TYPE_CHOICES.client,
            is_active=False,
            is_verified=False,
            password=self.password,
        )

        self.other_verified_user = User.objects.create_user(
            email='other@example.com',
            phone_number='+998909999111',
            full_name='Other User',
            user_type=USER_TYPE_CHOICES.client,
            is_active=True,
            is_verified=True,
            password=self.password,
        )
        self.worker_user = User.objects.create_user(
            email='worker@example.com',
            phone_number='+998908887766',
            full_name='Worker User',
            user_type=USER_TYPE_CHOICES.worker,
            is_active=True,
            is_verified=True,
            password=self.password,
        )

    def tearDown(self):
        self.media_override.disable()
        shutil.rmtree(self.temp_media_dir, ignore_errors=True)
        super().tearDown()

    def _register_payload(self, **kwargs):
        payload = {
            'email': 'new-user@example.com',
            'phone_number': '+998907778899',
            'full_name': 'New User',
            'user_type': USER_TYPE_CHOICES.worker,
            'password': 'NewPass123',
        }
        payload.update(kwargs)
        return payload

    def _extract_code_from_latest_email(self):
        self.assertTrue(mail.outbox)
        sent_email = mail.outbox[-1]
        code_match = re.search(r'\b(\d{5})\b', sent_email.body)
        self.assertIsNotNone(code_match)
        return code_match.group(1)

    def test_register_creates_inactive_user_and_sends_email(self):
        payload = self._register_payload()

        response = self.client.post(reverse('register'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email=payload['email'])
        self.assertFalse(user.is_verified)
        self.assertFalse(user.is_active)

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(payload['email'], mail.outbox[0].to)
        self.assertTrue(mail.outbox[0].alternatives)
        self.assertIn('text/html', [alt[1] for alt in mail.outbox[0].alternatives])

        payload_in_cache = get_activation_payload(payload['email'])
        self.assertIsNotNone(payload_in_cache)

    def test_register_rejects_duplicate_phone_with_clear_message(self):
        payload = self._register_payload(phone_number=self.verified_user.phone_number)
        response = self.client.post(reverse('register'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone_number', response.data)
        self.assertIn('allaqachon', str(response.data['phone_number']).lower())

    def test_register_rejects_duplicate_email_with_clear_message(self):
        payload = self._register_payload(email=self.verified_user.email)
        response = self.client.post(reverse('register'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertIn('allaqachon', str(response.data['email']).lower())

    def test_login_rejects_unverified_user(self):
        response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.unverified_user.email, 'password': self.password},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('tasdiqlanmagan', str(response.data).lower())

    def test_verify_email_activates_account(self):
        payload = self._register_payload(
            email='verify-me@example.com',
            phone_number='+998900000001',
        )
        self.client.post(reverse('register'), payload, format='json')
        code = self._extract_code_from_latest_email()

        verify_response = self.client.post(
            reverse('verify_email'),
            {'email': payload['email'], 'code': code},
            format='json',
        )

        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        user = User.objects.get(email=payload['email'])
        self.assertTrue(user.is_verified)
        self.assertTrue(user.is_active)
        self.assertIsNone(get_activation_payload(payload['email']))

    def test_resend_activation_has_cooldown_message(self):
        payload = self._register_payload(
            email='resend@example.com',
            phone_number='+998900000002',
        )
        self.client.post(reverse('register'), payload, format='json')

        response = self.client.post(
            reverse('resend_activation'),
            {'email': payload['email']},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('kuting', str(response.data).lower())

    def test_me_returns_current_user(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.verified_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        response = self.client.get(reverse('me'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.verified_user.email)
        self.assertEqual(response.data['phone_number'], self.verified_user.phone_number)

    def test_me_returns_default_client_photo_when_no_uploaded_photo(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.verified_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = self.client.get(reverse('me'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('/static/image/default_client.png', response.data['profile_photo_url'])

    def test_me_returns_default_worker_photo_when_no_uploaded_photo(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.worker_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = self.client.get(reverse('me'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('/static/image/default_worker.png', response.data['profile_photo_url'])

    def test_me_patch_updates_profile(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.verified_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        payload = {
            'full_name': 'Updated Client',
            'phone_number': '+998901234321',
        }

        response = self.client.patch(reverse('me'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.verified_user.refresh_from_db()
        self.assertEqual(self.verified_user.full_name, payload['full_name'])
        self.assertEqual(self.verified_user.phone_number, payload['phone_number'])

    def test_me_patch_rejects_duplicate_phone(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.verified_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = self.client.patch(
            reverse('me'),
            {'phone_number': self.other_verified_user.phone_number},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone_number', response.data)

    def test_me_patch_updates_profile_photo(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.verified_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        image = SimpleUploadedFile(
            'avatar.gif',
            (
                b'GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff'
                b'!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00'
                b'\x00\x02\x02L\x01\x00;'
            ),
            content_type='image/gif',
        )

        response = self.client.patch(
            reverse('me'),
            {'profile_photo': image},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('profile_photo_url', response.data)
        self.assertIn('/media/', response.data['profile_photo_url'])

    def test_me_delete_removes_account(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.verified_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = self.client.delete(reverse('me'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(User.objects.filter(email=self.verified_user.email).exists())

    def test_worker_profile_for_worker_get_and_patch(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.worker_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        get_response = self.client.get(reverse('worker_profile'))
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_response.data['specialization'], '')

        patch_response = self.client.patch(
            reverse('worker_profile'),
            {
                'specialization': 'Elektrik',
                'experience_years': 6,
                'service_city': 'Toshkent',
                'about': 'Uy va ofis elektr ishlari',
                'min_order_price': '250000.00',
                'is_available': True,
            },
            format='json',
        )

        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data['specialization'], 'Elektrik')
        self.assertEqual(patch_response.data['experience_years'], 6)

    def test_worker_profile_for_client_is_forbidden(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.verified_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = self.client.get(reverse('worker_profile'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_worker_skill_create_and_list_for_worker(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.worker_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        create_response = self.client.post(
            reverse('worker_skill_list_create'),
            {
                'title': 'Rozetka o`rnatish',
                'description': 'Uy va ofis uchun yangi rozetka liniyalari.',
                'min_price': '150000.00',
                'max_price': '400000.00',
                'experience_years': 5,
                'extra_info': 'Material narxi alohida hisoblanadi.',
                'is_active': True,
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data['title'], 'Rozetka o`rnatish')

        list_response = self.client.get(reverse('worker_skill_list_create'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data['results']), 1)

    def test_worker_skill_for_client_is_forbidden(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.verified_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = self.client.get(reverse('worker_skill_list_create'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_worker_dashboard_returns_stats(self):
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.worker_user.email, 'password': self.password},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        self.client.post(
            reverse('worker_skill_list_create'),
            {
                'title': 'Svetilnik montaj',
                'experience_years': 3,
                'is_active': True,
            },
            format='json',
        )

        dashboard_response = self.client.get(reverse('worker_dashboard'))
        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        self.assertIn('profile', dashboard_response.data)
        self.assertEqual(dashboard_response.data['skills_count'], 1)

    def test_public_worker_list_supports_search_filters(self):
        profile = WorkerProfile.objects.create(
            user=self.worker_user,
            specialization='Elektrik',
            service_city='Toshkent',
            about='Uy va ofis elektr xizmatlari',
            experience_years=7,
            is_available=True,
        )
        WorkerSkill.objects.create(
            profile=profile,
            title='Elektr panel montaj',
            description='Panel yig`ish va himoya avtomatlari.',
            is_active=True,
            experience_years=7,
        )

        other_worker = User.objects.create_user(
            email='worker-2@example.com',
            phone_number='+998907700011',
            full_name='Santexnik Usta',
            user_type=USER_TYPE_CHOICES.worker,
            is_active=True,
            is_verified=True,
            password=self.password,
        )
        WorkerProfile.objects.create(
            user=other_worker,
            specialization='Santexnik',
            service_city='Buxoro',
            experience_years=4,
        )

        self.client.credentials()
        response = self.client.get(
            f"{reverse('public_worker_list')}?q=elektr&city=toshkent&category=elektr"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['specialization'], 'Elektrik')

    def test_public_worker_detail_returns_active_skills(self):
        profile = WorkerProfile.objects.create(
            user=self.worker_user,
            specialization='Malyar',
            service_city='Samarqand',
            experience_years=5,
            is_available=True,
        )
        WorkerSkill.objects.create(profile=profile, title='Devor bo`yash', is_active=True, experience_years=5)
        WorkerSkill.objects.create(profile=profile, title='Nofaol xizmat', is_active=False, experience_years=1)

        self.client.credentials()
        response = self.client.get(reverse('public_worker_detail', kwargs={'pk': profile.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], profile.id)
        self.assertEqual(len(response.data['skills']), 1)
        self.assertEqual(response.data['skills'][0]['title'], 'Devor bo`yash')
