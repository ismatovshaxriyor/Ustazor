import os
import importlib.util

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

if importlib.util.find_spec("channels") is not None:
    from channels.routing import ProtocolTypeRouter, URLRouter
    from channels.security.websocket import AllowedHostsOriginValidator

    from apps.chat.middleware import JWTAuthMiddleware
    from apps.chat.routing import websocket_urlpatterns

    application = ProtocolTypeRouter(
        {
            'http': django_asgi_app,
            'websocket': AllowedHostsOriginValidator(
                JWTAuthMiddleware(
                    URLRouter(websocket_urlpatterns),
                )
            ),
        }
    )
else:
    application = django_asgi_app
