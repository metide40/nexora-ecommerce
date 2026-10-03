from django.core.management import call_command
from rest_framework.test import APITestCase

from store.models import Product

SHIPPING = {
    "email": "a@b.com", "firstName": "Abel", "lastName": "T", "address": "1 Main St",
    "city": "Addis", "state": "AA", "zip": "1000", "phone": "0911000000",
}


class ApiFlowTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_products", verbosity=0)

    def register(self, email="abel@example.com"):
        r = self.client.post("/api/auth/register/", {
            "name": "Abel", "email": email, "password": "secret123", "confirmPassword": "secret123"})
        self.assertEqual(r.status_code, 201, r.data)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + r.data["token"])
        return r.data

    # ---- products
    def test_product_list_matches_frontend_shape(self):
        r = self.client.get("/api/products/")
        data = r.json()  # what the browser really receives
        self.assertEqual(len(data), 12)
        p = data[0]
        for key in ["id", "name", "category", "price", "originalPrice", "reviews", "images", "colors", "specs"]:
            self.assertIn(key, p)
        self.assertIsInstance(p["price"], float)

    def test_filters(self):
        self.assertTrue(all(p["category"] == "fashion" for p in self.client.get("/api/products/?category=fashion").data))
        deals = self.client.get("/api/products/?deals=1").data
        self.assertTrue(deals and all(p["originalPrice"] for p in deals))
        self.assertTrue(self.client.get("/api/products/?search=headphones").data)
        prices = [p["price"] for p in self.client.get("/api/products/?sort=price-asc").data]
        self.assertEqual(prices, sorted(prices))

    def test_product_detail_and_404(self):
        self.assertEqual(self.client.get("/api/products/1/").status_code, 200)
        self.assertEqual(self.client.get("/api/products/9999/").status_code, 404)

    # ---- auth
    def test_register_login_me_logout(self):
        self.register()
        self.assertEqual(self.client.get("/api/auth/me/").data["name"], "Abel")
        self.client.post("/api/auth/logout/")
        self.client.credentials()
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        r = self.client.post("/api/auth/login/", {"email": "ABEL@example.com", "password": "secret123"})
        self.assertEqual(r.status_code, 200)  # email is case-insensitive

    def test_register_rejects_duplicates_and_bad_input(self):
        self.register()
        dup = self.client.post("/api/auth/register/", {"name": "X1", "email": "abel@example.com", "password": "secret123"})
        self.assertEqual(dup.status_code, 400)
        short = self.client.post("/api/auth/register/", {"name": "Xy", "email": "n@e.com", "password": "123"})
        self.assertEqual(short.status_code, 400)
        bad = self.client.post("/api/auth/login/", {"email": "abel@example.com", "password": "wrong"})
        self.assertEqual(bad.status_code, 400)

    # ---- orders
    def test_order_requires_login(self):
        r = self.client.post("/api/orders/", {**SHIPPING, "items": [{"productId": 1, "quantity": 1}]}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_order_is_priced_by_server_and_reduces_stock(self):
        self.register()
        product = Product.objects.get(id=1)
        stock_before = product.stock
        payload = {**SHIPPING, "items": [{"productId": 1, "quantity": 2, "color": "Black", "price": 0.01}]}
        r = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        body = r.json()
        self.assertEqual(body["subtotal"], float(product.price * 2))  # fake price ignored
        self.assertEqual(body["shipping"], 0)  # over $75 -> free
        self.assertTrue(r.data["orderNumber"].startswith("NX-"))
        product.refresh_from_db()
        self.assertEqual(product.stock, stock_before - 2)

    def test_shipping_fee_under_threshold(self):
        self.register()
        cheap = Product.objects.order_by("price").first()
        r = self.client.post("/api/orders/", {**SHIPPING, "items": [{"productId": cheap.id, "quantity": 1}]}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        if cheap.price < 75:
            self.assertEqual(r.json()["shipping"], 9.99)

    def test_order_rejections(self):
        self.register()
        too_many = self.client.post("/api/orders/", {**SHIPPING, "items": [{"productId": 1, "quantity": 99999}]}, format="json")
        self.assertEqual(too_many.status_code, 400)
        Product.objects.filter(id=1).update(stock=1)
        oversell = self.client.post("/api/orders/", {**SHIPPING, "items": [{"productId": 1, "quantity": 2}]}, format="json")
        self.assertEqual(oversell.status_code, 400)
        empty = self.client.post("/api/orders/", {**SHIPPING, "items": []}, format="json")
        self.assertEqual(empty.status_code, 400)
        ghost = self.client.post("/api/orders/", {**SHIPPING, "items": [{"productId": 9999, "quantity": 1}]}, format="json")
        self.assertEqual(ghost.status_code, 400)
        badcolor = self.client.post("/api/orders/", {**SHIPPING, "items": [{"productId": 2, "quantity": 1, "color": "Neon"}]}, format="json")
        self.assertEqual(badcolor.status_code, 400)

    def test_users_only_see_their_own_orders(self):
        self.register("one@example.com")
        o = self.client.post("/api/orders/", {**SHIPPING, "items": [{"productId": 1, "quantity": 1}]}, format="json").data
        self.assertEqual(len(self.client.get("/api/orders/").data), 1)
        self.client.credentials()
        self.register("two@example.com")
        self.assertEqual(len(self.client.get("/api/orders/").data), 0)
        self.assertEqual(self.client.get(f"/api/orders/{o['orderNumber']}/").status_code, 404)
