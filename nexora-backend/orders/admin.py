from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["name", "price", "quantity", "color", "size"]
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "user", "total", "status", "created_at"]
    list_filter = ["status", "created_at"]
    list_editable = ["status"]  # change status straight from the list
    search_fields = ["order_number", "email", "user__email"]
    inlines = [OrderItemInline]
