import random
from django.conf import settings
from django.db import models
from django.utils import timezone


def generate_order_number():
    # e.g. NX-2026-4821 (same format the success page already shows)
    return f"NX-{timezone.now().year}-{random.randint(100000, 999999)}"


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    order_number = models.CharField(max_length=20, unique=True, default=generate_order_number)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Shipping details (from checkout.html)
    email = models.EmailField()
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    apartment = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    phone = models.CharField(max_length=30)

    # Money is calculated by the SERVER, never trusted from the browser
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order_number} ({self.user})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    # SET_NULL: if a product is deleted later, old orders still keep their history
    product = models.ForeignKey("store.Product", on_delete=models.SET_NULL, null=True, blank=True)
    # Snapshot of the product at purchase time (price/name may change later)
    name = models.CharField(max_length=200)
    image = models.URLField(max_length=500, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    color = models.CharField(max_length=50, blank=True)
    size = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"{self.quantity} x {self.name}"

    @property
    def line_total(self):
        return self.price * self.quantity
