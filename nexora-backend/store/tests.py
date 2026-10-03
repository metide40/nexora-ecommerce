from django.core.management import call_command
from rest_framework.test import APITestCase

from store.models import Product


class FavoritesTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_products", verbosity=0)

    def login(self, email):
        r = self.client.post("/api/auth/register/", {"name": "User", "email": email, "password": "secret123"})
        self.client.credentials(HTTP_AUTHORIZATION="Token " + r.data["token"])

    def test_requires_login(self):
        self.assertEqual(self.client.get("/api/favorites/").status_code, 401)
        self.assertEqual(self.client.post("/api/favorites/", {"productId": 1}, format="json").status_code, 401)

    def test_add_list_remove(self):
        self.login("a@example.com")
        self.assertEqual(self.client.get("/api/favorites/").json(), [])
        self.assertEqual(self.client.post("/api/favorites/", {"productId": 1}, format="json").status_code, 201)
        self.assertEqual(self.client.post("/api/favorites/", {"productId": 3}, format="json").status_code, 201)
        # repeating is safe, no duplicate
        self.assertEqual(self.client.post("/api/favorites/", {"productId": 1}, format="json").status_code, 200)
        favs = self.client.get("/api/favorites/").json()
        self.assertEqual([p["id"] for p in favs], [3, 1])  # newest first
        self.assertIn("originalPrice", favs[0])  # same shape as /api/products/
        self.assertEqual(self.client.delete("/api/favorites/1/").status_code, 204)
        self.assertEqual(self.client.delete("/api/favorites/1/").status_code, 204)  # repeat is fine
        self.assertEqual([p["id"] for p in self.client.get("/api/favorites/").json()], [3])

    def test_bad_input(self):
        self.login("a@example.com")
        for bad in [{}, {"productId": "abc"}, {"productId": 9999}]:
            self.assertEqual(self.client.post("/api/favorites/", bad, format="json").status_code, 400)

    def test_favorites_are_private(self):
        self.login("one@example.com")
        self.client.post("/api/favorites/", {"productId": 2}, format="json")
        self.client.credentials()
        self.login("two@example.com")
        self.assertEqual(self.client.get("/api/favorites/").json(), [])
        self.client.delete("/api/favorites/2/")  # must not remove user one's favorite
        self.client.credentials()
        self.login_again = self.client.post("/api/auth/login/", {"email": "one@example.com", "password": "secret123"})
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.login_again.json()["token"])
        self.assertEqual(len(self.client.get("/api/favorites/").json()), 1)

    def test_inactive_products_are_hidden(self):
        self.login("a@example.com")
        self.client.post("/api/favorites/", {"productId": 4}, format="json")
        Product.objects.filter(id=4).update(is_active=False)
        self.assertEqual(self.client.get("/api/favorites/").json(), [])
