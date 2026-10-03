from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="slug")
    count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "description", "image", "count"]


class ProductSerializer(serializers.ModelSerializer):
    """
    Output matches the objects in the frontend's products.js, so existing
    render code (product.name, product.originalPrice, ...) keeps working.
    """
    category = serializers.CharField(source="category_id")
    # coerce_to_string=False -> numbers (149.99) instead of strings ("149.99")
    price = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    originalPrice = serializers.DecimalField(
        source="original_price", max_digits=10, decimal_places=2, coerce_to_string=False
    )
    rating = serializers.DecimalField(max_digits=2, decimal_places=1, coerce_to_string=False)
    reviews = serializers.IntegerField(source="reviews_count")
    images = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "category", "price", "originalPrice", "rating", "reviews",
            "image", "images", "description", "specs", "colors", "sizes",
            "badge", "featured", "stock",
        ]

    def get_images(self, obj):
        urls = [g.url for g in obj.gallery.all()]
        return urls or [obj.image]
