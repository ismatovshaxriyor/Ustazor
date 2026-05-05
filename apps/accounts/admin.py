from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.accounts.models import WorkerProfile, WorkerProfileView, WorkerSkill

User = get_user_model()


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = (
        'id',
        'email',
        'clerk_user_id',
        'full_name',
        'phone_number',
        'secondary_phone_number',
        'telegram_username',
        'instagram_username',
        'user_type',
        'is_verified',
        'is_active',
        'is_staff',
        'date_joined',
    )
    list_filter = ('user_type', 'is_verified', 'is_active', 'is_staff', 'is_superuser')
    search_fields = (
        'email',
        'clerk_user_id',
        'full_name',
        'phone_number',
        'secondary_phone_number',
        'telegram_username',
        'instagram_username',
    )
    ordering = ('-date_joined',)
    readonly_fields = ('date_joined', 'last_login')

    fieldsets = (
        ('Akkaunt', {'fields': ('email', 'clerk_user_id', 'password')}),
        (
            'Shaxsiy ma`lumotlar',
            {
                'fields': (
                    'full_name',
                    'phone_number',
                    'secondary_phone_number',
                    'telegram_username',
                    'instagram_username',
                    'profile_photo',
                    'user_type',
                )
            },
        ),
        ('Ruxsatlar', {'fields': ('is_verified', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Muhim sanalar', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (
            None,
            {
                'classes': ('wide',),
                'fields': (
                    'email',
                    'clerk_user_id',
                    'phone_number',
                    'secondary_phone_number',
                    'telegram_username',
                    'instagram_username',
                    'full_name',
                    'user_type',
                    'password1',
                    'password2',
                ),
            },
        ),
    )


for model in (OutstandingToken, BlacklistedToken):
    try:
        admin.site.unregister(model)
    except admin.sites.NotRegistered:
        pass


@admin.register(WorkerProfile)
class WorkerProfileAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'specialization',
        'experience_years',
        'service_city',
        'min_order_price',
        'is_available',
        'updated_at',
    )
    list_filter = ('is_available', 'service_city', 'updated_at')
    search_fields = ('user__email', 'user__full_name', 'specialization', 'service_city')
    autocomplete_fields = ('user',)


@admin.register(WorkerSkill)
class WorkerSkillAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'profile',
        'experience_years',
        'min_price',
        'max_price',
        'is_active',
        'updated_at',
    )
    list_filter = ('is_active', 'experience_years', 'updated_at')
    search_fields = ('title', 'profile__user__email', 'profile__user__full_name', 'description')
    autocomplete_fields = ('profile',)


@admin.register(WorkerProfileView)
class WorkerProfileViewAdmin(admin.ModelAdmin):
    list_display = ('id', 'worker', 'viewer', 'viewer_name', 'viewed_at')
    list_filter = ('viewed_at',)
    search_fields = ('worker__email', 'worker__full_name', 'viewer__email', 'viewer__full_name', 'viewer_name')
    autocomplete_fields = ('worker', 'viewer')
