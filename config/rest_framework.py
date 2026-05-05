import os
from datetime import timedelta


def env_int(key: str, default: int) -> int:
    value = os.environ.get(key, "")
    if value is None or str(value).strip() == "":
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.common.exceptions.custom_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": env_int("API_PAGE_SIZE", 20),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.environ.get("API_THROTTLE_ANON", "120/hour"),
        "user": os.environ.get("API_THROTTLE_USER", "1200/hour"),
        "auth_login": os.environ.get("API_THROTTLE_AUTH_LOGIN", "10/min"),
        "auth_register": os.environ.get("API_THROTTLE_AUTH_REGISTER", "5/hour"),
        "auth_verify_activation": os.environ.get("API_THROTTLE_VERIFY_ACTIVATION", "20/hour"),
        "auth_resend_activation": os.environ.get("API_THROTTLE_RESEND_ACTIVATION", "10/hour"),
        "chat_post_message": os.environ.get("API_THROTTLE_CHAT_POST_MESSAGE", "120/min"),
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),

    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,

    'AUTH_HEADER_TYPES': ('Bearer',),
}
