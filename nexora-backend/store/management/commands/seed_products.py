"""
Load the original frontend catalog (products.js) into the database.
Safe to run multiple times: it updates existing rows instead of duplicating.

    python manage.py seed_products
"""
import json
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand
from django.core.management.color import no_style
from django.db import connection

from store.models import Category, Product, ProductImage


class Command(BaseCommand):
    help = "Seed categories and products from store/data/seed.json"

    def handle(self, *args, **options):
        data = json.loads((Path(__file__).resolve().parents[2] / "data" / "seed.json").read_text())

        for c in data["categories"]:
            if c["id"] == "deals":  # virtual category, handled by ?deals=1
                continue
            Category.objects.update_or_create(
                slug=c["id"],
                defaults={"name": c["name"], "description": c["description"], "image": c["image"]},
            )

        for p in data["products"]:
            product, _ = Product.objects.update_or_create(
                id=p["id"],
                defaults={
                    "category_id": p["category"],
                    "name": p["name"],
                    "description": p["description"],
                    "price": Decimal(str(p["price"])),
                    "original_price": Decimal(str(p["originalPrice"])) if p.get("originalPrice") else None,
                    "rating": Decimal(str(p["rating"])),
                    "reviews_count": p["reviews"],
                    "image": p["image"],
                    "badge": p.get("badge") or "",
                    "featured": bool(p.get("featured")),
                    "specs": p.get("specs") or {},
                    "colors": p.get("colors") or [],
                    "sizes": p.get("sizes"),
                },
            )
            product.gallery.all().delete()
            ProductImage.objects.bulk_create(
                [ProductImage(product=product, url=u, position=i) for i, u in enumerate(p.get("images", []))]
            )

        # PostgreSQL: we inserted explicit ids, so move the id counter forward,
        # otherwise the next product created in the admin would collide.
        with connection.cursor() as cursor:
            for sql in connection.ops.sequence_reset_sql(no_style(), [Product, ProductImage]):
                cursor.execute(sql)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Category.objects.count()} categories and {Product.objects.count()} products."
        ))
