from django.db.models import Count, Q
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Favorite, Product
from .serializers import CategorySerializer, ProductSerializer


class ProductListView(ListAPIView):
    """
    GET /api/products/
      ?category=electronics   filter by category (repeat or comma-separate for many)
      ?search=watch           matches name / category / description
      ?deals=1                only discounted products
      ?featured=1             only featured products
      ?min_price=10&max_price=100
      ?sort=price-asc | price-desc | rating | featured   (default: id)
    """
    serializer_class = ProductSerializer
    pagination_class = None  # frontend expects the full list

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).select_related("category").prefetch_related("gallery")
        p = self.request.query_params

        categories = []
        for value in p.getlist("category"):
            categories += [c for c in value.split(",") if c and c != "deals"]
        if categories:
            qs = qs.filter(category_id__in=categories)

        if p.get("deals") == "1" or "deals" in p.getlist("category"):
            qs = qs.filter(original_price__isnull=False)
        if p.get("featured") == "1":
            qs = qs.filter(featured=True)

        search = p.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(category__name__icontains=search)
                | Q(category__slug__icontains=search)
                | Q(description__icontains=search)
            )

        try:
            if p.get("min_price"):
                qs = qs.filter(price__gte=p["min_price"])
            if p.get("max_price"):
                qs = qs.filter(price__lte=p["max_price"])
        except Exception:
            pass  # ignore malformed numbers instead of crashing

        ordering = {
            "price-asc": ["price"],
            "price-desc": ["-price"],
            "rating": ["-rating"],
            "featured": ["-featured", "id"],
        }.get(p.get("sort"), ["id"])
        return qs.order_by(*ordering)


class ProductDetailView(RetrieveAPIView):
    """GET /api/products/<id>/"""
    serializer_class = ProductSerializer
    queryset = Product.objects.filter(is_active=True).prefetch_related("gallery")


class CategoryListView(ListAPIView):
    """GET /api/categories/  (with product counts)"""
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(
            count=Count("products", filter=Q(products__is_active=True))
        )


class FavoriteListCreateView(APIView):
    """
    GET  /api/favorites/               my saved products (newest first), same shape as /api/products/
    POST /api/favorites/ {productId}   save a product (safe to repeat)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        favorites = (
            Favorite.objects.filter(user=request.user, product__is_active=True)
            .select_related("product__category")
            .prefetch_related("product__gallery")
        )
        return Response(ProductSerializer([f.product for f in favorites], many=True).data)

    def post(self, request):
        try:
            product_id = int(request.data.get("productId"))
        except (TypeError, ValueError):
            return Response({"productId": "A valid product id is required."}, status=status.HTTP_400_BAD_REQUEST)
        product = Product.objects.filter(pk=product_id, is_active=True).first()
        if not product:
            return Response({"productId": "Product not found."}, status=status.HTTP_400_BAD_REQUEST)
        _, created = Favorite.objects.get_or_create(user=request.user, product=product)
        return Response({"productId": product.id, "favorited": True},
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class FavoriteDeleteView(APIView):
    """DELETE /api/favorites/<product_id>/  remove from my favorites (safe to repeat)"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, product_id):
        Favorite.objects.filter(user=request.user, product_id=product_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
