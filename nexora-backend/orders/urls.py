from django.urls import path
from . import views

urlpatterns = [
    path("orders/", views.OrderListCreateView.as_view()),
    path("orders/<str:order_number>/", views.OrderDetailView.as_view()),
]
