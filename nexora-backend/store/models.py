from django.conf import settings
from django.db import models


class Category(models.Model):
    # slug is the short id the frontend already uses: "electronics", "fashion"...
    slug = models.SlugField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)
    image = models.URLField(max_length=500, blank=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    BADGE_CHOICES = [("Sale", "Sale"), ("New", "New")]

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    # If set, the product is "on sale" (this is what the Deals filter uses)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    reviews_count = models.PositiveIntegerField(default=0)
    image = models.URLField(max_length=500)  # main image
    badge = models.CharField(max_length=10, choices=BADGE_CHOICES, blank=True)
    featured = models.BooleanField(default=False)
    stock = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)  # hide without deleting
    # Flexible product data: {"Battery Life": "40 hours"}, ["Black","Navy"], ["S","M"]
    specs = models.JSONField(default=dict, blank=True)
    colors = models.JSONField(default=list, blank=True)
    sizes = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    """Extra gallery images shown on the product details page."""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="gallery")
    url = models.URLField(max_length=500)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position"]

    def __str__(self):
        return f"{self.product.name} #{self.position}"


class Favorite(models.Model):
    """A product a logged-in user has saved (wishlist / hearts)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # a user can favorite a product only once
            models.UniqueConstraint(fields=["user", "product"], name="unique_user_favorite"),
        ]

    def __str__(self):
        return f"{self.user} -> {self.product}"
