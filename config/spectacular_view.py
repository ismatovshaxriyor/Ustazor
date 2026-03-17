from drf_spectacular.views import SpectacularSwaggerView


class CustomSwaggerView(SpectacularSwaggerView):
    template_name = "swagger_ui.html"