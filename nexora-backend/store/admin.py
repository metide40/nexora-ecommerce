from django.contrib import admin
from .models import Category, Favorite, Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["slug", "name"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "price", "original_price", "stock", "featured", "is_active"]
    list_filter = ["category", "featured", "is_active"]
    search_fields = ["name", "description"]
    list_editable = ["stock", "featured", "is_active"]
    inlines = [ProductImageInline]


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    """Read-only: handy to see which products customers love."""
    list_display = ["user", "product", "created_at"]
    list_filter = ["product__category"]
    search_fields = ["user__email", "product__name"]

    def has_add_permission(self, request):
        return False
