from datetime import datetime

from django.core.cache import cache
from django.utils import timezone


PRESENCE_CONNECTIONS_TTL_SECONDS = 60 * 60
PRESENCE_LAST_SEEN_TTL_SECONDS = 60 * 60 * 24 * 14


def _connections_key(user_id: int) -> str:
    return f'chat_presence:user:{user_id}:connections'


def _last_seen_key(user_id: int) -> str:
    return f'chat_presence:user:{user_id}:last_seen'


def _set_last_seen(user_id: int) -> str:
    now = timezone.now().isoformat()
    try:
        cache.set(_last_seen_key(user_id), now, timeout=PRESENCE_LAST_SEEN_TTL_SECONDS)
    except Exception:
        pass
    return now


def mark_user_connected(user_id: int) -> tuple[bool, str]:
    key = _connections_key(user_id)
    try:
        current = int(cache.get(key) or 0)
    except Exception:
        current = 0
    next_value = current + 1
    try:
        cache.set(key, next_value, timeout=PRESENCE_CONNECTIONS_TTL_SECONDS)
    except Exception:
        pass
    last_seen_at = _set_last_seen(user_id)
    return next_value > 0, last_seen_at


def mark_user_disconnected(user_id: int) -> tuple[bool, str]:
    key = _connections_key(user_id)
    try:
        current = int(cache.get(key) or 0)
    except Exception:
        current = 0
    next_value = max(current - 1, 0)
    try:
        if next_value == 0:
            cache.delete(key)
        else:
            cache.set(key, next_value, timeout=PRESENCE_CONNECTIONS_TTL_SECONDS)
    except Exception:
        pass
    last_seen_at = _set_last_seen(user_id)
    return next_value > 0, last_seen_at


def get_user_online(user_id: int) -> bool:
    try:
        return int(cache.get(_connections_key(user_id)) or 0) > 0
    except Exception:
        return False


def get_user_last_seen(user_id: int):
    try:
        raw = cache.get(_last_seen_key(user_id))
    except Exception:
        raw = None
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except (TypeError, ValueError):
        return None
