import math
from dataclasses import dataclass

from django.core.cache import cache
from django.utils import timezone
from django.utils.crypto import get_random_string


@dataclass(frozen=True)
class ActivationPayload:
    code: str
    expires_at_epoch: int


def _normalize_email(email: str) -> str:
    return email.lower().strip()


def _activation_key(email: str) -> str:
    return f'activation:{_normalize_email(email)}:payload'


def _attempt_key(email: str) -> str:
    return f'activation:{_normalize_email(email)}:attempts'


def _cooldown_key(email: str) -> str:
    return f'activation:{_normalize_email(email)}:resend_cooldown'


def generate_activation_code(length: int = 5) -> str:
    return get_random_string(length=length, allowed_chars='0123456789')


def set_activation_payload(
    email: str,
    code: str,
    ttl_seconds: int,
    resend_cooldown_seconds: int,
) -> None:
    expires_at_epoch = int(timezone.now().timestamp()) + ttl_seconds
    payload = {'code': code, 'expires_at_epoch': expires_at_epoch}

    cache.set(_activation_key(email), payload, ttl_seconds)
    cache.delete(_attempt_key(email))

    if resend_cooldown_seconds > 0:
        cooldown_until = int(timezone.now().timestamp()) + resend_cooldown_seconds
        cache.set(_cooldown_key(email), cooldown_until, resend_cooldown_seconds)


def get_activation_payload(email: str) -> ActivationPayload | None:
    payload = cache.get(_activation_key(email))
    if not payload:
        return None

    return ActivationPayload(
        code=payload['code'],
        expires_at_epoch=payload['expires_at_epoch'],
    )


def clear_activation_payload(email: str) -> None:
    cache.delete_many([
        _activation_key(email),
        _attempt_key(email),
        _cooldown_key(email),
    ])


def get_remaining_resend_cooldown(email: str) -> int:
    cooldown_until = cache.get(_cooldown_key(email))
    if not cooldown_until:
        return 0

    remaining = math.ceil(cooldown_until - timezone.now().timestamp())
    return max(0, remaining)


def register_failed_attempt(email: str, ttl_seconds: int, max_attempts: int) -> tuple[int, bool]:
    attempts = int(cache.get(_attempt_key(email), 0)) + 1
    cache.set(_attempt_key(email), attempts, ttl_seconds)
    is_blocked = attempts >= max_attempts
    return attempts, is_blocked
