from django.urls import path
from . import views

urlpatterns = [
    path("products/", views.ProductListView.as_view()),
    path("products/<int:pk>/", views.ProductDetailView.as_view()),
    path("categories/", views.CategoryListView.as_view()),
    path("favorites/", views.FavoriteListCreateView.as_view()),
    path("favorites/<int:product_id>/", views.FavoriteDeleteView.as_view()),
]
