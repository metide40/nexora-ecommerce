from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from store.models import Product
from .models import Order, OrderItem

FREE_SHIPPING_THRESHOLD = Decimal("75.00")  # same rule as cart.js
SHIPPING_FEE = Decimal("9.99")


class OrderItemInputSerializer(serializers.Serializer):
    productId = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=99)
    color = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    size = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class OrderCreateSerializer(serializers.Serializer):
    """
    What the browser sends. Notice there are NO prices here: the server looks
    them up itself, so a user can't edit the cart in DevTools to pay $0.01.
    """
    email = serializers.EmailField()
    firstName = serializers.CharField(max_length=100)
    lastName = serializers.CharField(max_length=100)
    address = serializers.CharField(max_length=255)
    apartment = serializers.CharField(max_length=100, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    zip = serializers.CharField(max_length=20)
    phone = serializers.CharField(max_length=30)
    items = OrderItemInputSerializer(many=True, allow_empty=False)

    @transaction.atomic  # all-or-nothing: if anything fails, nothing is saved
    def create(self, validated):
        user = self.context["request"].user
        items = validated.pop("items")

        # Lock the product rows so two simultaneous orders can't oversell stock.
        ids = {i["productId"] for i in items}
        products = {p.id: p for p in Product.objects.select_for_update().filter(id__in=ids, is_active=True)}

        lines, subtotal = [], Decimal("0")
        for item in items:
            product = products.get(item["productId"])
            if not product:
                raise serializers.ValidationError({"items": f"Product {item['productId']} is not available."})
            color, size = item.get("color") or "", item.get("size") or ""
            if color and product.colors and color not in product.colors:
                raise serializers.ValidationError({"items": f"Invalid color for {product.name}."})
            if size and (not product.sizes or size not in product.sizes):
                raise serializers.ValidationError({"items": f"Invalid size for {product.name}."})
            if product.stock < item["quantity"]:
                raise serializers.ValidationError(
                    {"items": f"Only {product.stock} left in stock for {product.name}."}
                )
            subtotal += product.price * item["quantity"]
            lines.append((product, item["quantity"], color, size))

        shipping = Decimal("0") if subtotal >= FREE_SHIPPING_THRESHOLD else SHIPPING_FEE

        order = Order.objects.create(
            user=user,
            email=validated["email"],
            first_name=validated["firstName"],
            last_name=validated["lastName"],
            address=validated["address"],
            apartment=validated.get("apartment", ""),
            city=validated["city"],
            state=validated["state"],
            zip_code=validated["zip"],
            phone=validated["phone"],
            subtotal=subtotal,
            shipping=shipping,
            total=subtotal + shipping,
        )
        for product, qty, color, size in lines:
            OrderItem.objects.create(
                order=order, product=product, name=product.name, image=product.image,
                price=product.price, quantity=qty, color=color, size=size,
            )
            product.stock -= qty
            product.save(update_fields=["stock"])
        return order


class OrderItemSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    productId = serializers.IntegerField(source="product_id", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["productId", "name", "image", "price", "quantity", "color", "size"]


class OrderSerializer(serializers.ModelSerializer):
    orderNumber = serializers.CharField(source="order_number")
    createdAt = serializers.DateTimeField(source="created_at")
    items = OrderItemSerializer(many=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    shipping = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    firstName = serializers.CharField(source="first_name")
    lastName = serializers.CharField(source="last_name")
    zip = serializers.CharField(source="zip_code")

    class Meta:
        model = Order
        fields = ["orderNumber", "status", "createdAt", "items", "subtotal", "shipping", "total",
                  "email", "firstName", "lastName", "address", "apartment", "city", "state",
                  "zip", "phone"]
