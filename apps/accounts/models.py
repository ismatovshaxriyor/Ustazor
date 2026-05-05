from django.contrib.auth.hashers import make_password
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


class USER_TYPE_CHOICES(models.TextChoices):
    client = 'client', 'client'
    worker = 'worker', 'worker'


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email must be set')
        if not extra_fields.get('phone_number'):
            raise ValueError('Phone number must be set')
        if not password:
            raise ValueError('Password must be set')

        email = self.normalize_email(email)
        extra_fields.setdefault('user_type', USER_TYPE_CHOICES.client)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        if not extra_fields.get('phone_number'):
            raise ValueError('Superuser must have phone_number.')

        extra_fields.setdefault('user_type', USER_TYPE_CHOICES.worker)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True, null=True)
    clerk_user_id = models.CharField(max_length=128, unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=15, null=False, unique=True)
    secondary_phone_number = models.CharField(max_length=15, null=True, blank=True)
    telegram_username = models.CharField(max_length=64, null=True, blank=True)
    instagram_username = models.CharField(max_length=64, null=True, blank=True)
    full_name = models.CharField(max_length=30, null=True, blank=True)
    date_joined = models.DateTimeField(default=timezone.now)
    profile_photo = models.ImageField(
        upload_to="media/profile_photos/",
        blank=True,
        null=True
    )
    notification = models.BooleanField(default=False)
    promotional_notification = models.BooleanField(default=False)
    user_type = models.CharField()
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['phone_number']

    def __str__(self):
        return f"{self.full_name} -> {self.email}"

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    class Meta:
        verbose_name = "Admin"
        verbose_name_plural = "Admins"


class WorkerProfile(models.Model):
    user = models.OneToOneField(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='worker_profile',
    )
    specialization = models.CharField(max_length=120, blank=True)
    experience_years = models.PositiveSmallIntegerField(default=0)
    service_city = models.CharField(max_length=80, blank=True)
    about = models.TextField(blank=True)
    min_order_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Usta profili'
        verbose_name_plural = 'Usta profillari'

    def __str__(self):
        return f'WorkerProfile<{self.user_id}>'


class WorkerSkill(models.Model):
    profile = models.ForeignKey(
        WorkerProfile,
        on_delete=models.CASCADE,
        related_name='skills',
    )
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    min_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    max_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    experience_years = models.PositiveSmallIntegerField(default=0)
    extra_info = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Usta xizmati'
        verbose_name_plural = 'Usta xizmatlari'
        ordering = ('-updated_at', '-created_at')

    def __str__(self):
        return f'{self.title} ({self.profile_id})'


class WorkerProfileView(models.Model):
    worker = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='received_profile_views',
    )
    viewer = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_profile_views',
    )
    viewer_name = models.CharField(max_length=120, blank=True)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Usta profil ko`rishi'
        verbose_name_plural = 'Usta profil ko`rishlari'
        ordering = ('-viewed_at',)
        indexes = [
            models.Index(fields=['worker', '-viewed_at']),
            models.Index(fields=['worker', 'viewer', '-viewed_at']),
        ]

    def __str__(self):
        return f'WorkerProfileView<worker={self.worker_id}, viewer={self.viewer_id}>'
