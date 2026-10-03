from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def api_root(request):
    return JsonResponse({"name": "NEXORA API", "status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api_root),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("store.urls")),
    path("api/", include("orders.urls")),
    path("api/", include("contact.urls")),
]
