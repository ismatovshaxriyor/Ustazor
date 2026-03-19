import asyncio
import logging

logger = logging.getLogger(__name__)


def _get_channel_layer():
    try:
        from channels.layers import get_channel_layer
    except ModuleNotFoundError:
        return None
    return get_channel_layer()


async def _group_send_async(group_name: str, payload: dict) -> None:
    layer = _get_channel_layer()
    if layer is None:
        return

    try:
        await layer.group_send(group_name, payload)
    except Exception as exc:
        logger.warning("WebSocket group_send xatoligi (%s): %s", group_name, exc)


def _group_send(group_name: str, payload: dict) -> None:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        try:
            from asgiref.sync import async_to_sync

            async_to_sync(_group_send_async)(group_name, payload)
        except Exception as exc:
            logger.warning("WebSocket group_send xatoligi (%s): %s", group_name, exc)
        return

    # Async event loop ichida bo`lsa, sync wrapper ishlatmasdan task sifatida yuboramiz.
    asyncio.create_task(_group_send_async(group_name, payload))


def thread_group_name(thread_id: int) -> str:
    return f'chat_thread_{thread_id}'


def broadcast_chat_message(thread_id: int, message: dict) -> None:
    _group_send(
        thread_group_name(thread_id),
        {
            'type': 'chat.message',
            'message': message,
        },
    )


def broadcast_thread_update(thread_id: int, data: dict) -> None:
    _group_send(
        thread_group_name(thread_id),
        {
            'type': 'chat.thread_update',
            'data': data,
        },
    )


def broadcast_delivery_receipt(thread_id: int, data: dict) -> None:
    _group_send(
        thread_group_name(thread_id),
        {
            'type': 'chat.delivery_receipt',
            'data': data,
        },
    )


def broadcast_read_receipt(thread_id: int, data: dict) -> None:
    _group_send(
        thread_group_name(thread_id),
        {
            'type': 'chat.read_receipt',
            'data': data,
        },
    )


def broadcast_presence_update(thread_id: int, data: dict) -> None:
    _group_send(
        thread_group_name(thread_id),
        {
            'type': 'chat.presence_update',
            'data': data,
        },
    )
