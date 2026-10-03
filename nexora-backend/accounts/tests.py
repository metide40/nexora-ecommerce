from rest_framework.test import APITestCase


class ProfileTests(APITestCase):
    def setUp(self):
        r = self.client.post("/api/auth/register/", {"name": "Abel", "email": "abel@example.com", "password": "secret123"})
        self.token = r.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token)

    def test_me_includes_joined_date(self):
        self.assertIn("joined", self.client.get("/api/auth/me/").json())

    def test_update_name_but_not_email(self):
        r = self.client.patch("/api/auth/me/", {"name": "Abel T", "email": "hacker@example.com"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["name"], "Abel T")
        self.assertEqual(r.json()["email"], "abel@example.com")  # email untouched
        self.assertEqual(self.client.patch("/api/auth/me/", {"name": "A"}, format="json").status_code, 400)

    def test_change_password_flow(self):
        wrong = self.client.post("/api/auth/change-password/", {"currentPassword": "nope", "newPassword": "newsecret1"}, format="json")
        self.assertEqual(wrong.status_code, 400)
        self.assertIn("currentPassword", wrong.json())
        short = self.client.post("/api/auth/change-password/", {"currentPassword": "secret123", "newPassword": "123"}, format="json")
        self.assertEqual(short.status_code, 400)
        mismatch = self.client.post("/api/auth/change-password/", {"currentPassword": "secret123", "newPassword": "newsecret1", "confirmPassword": "x"}, format="json")
        self.assertEqual(mismatch.status_code, 400)

        ok = self.client.post("/api/auth/change-password/", {"currentPassword": "secret123", "newPassword": "newsecret1", "confirmPassword": "newsecret1"}, format="json")
        self.assertEqual(ok.status_code, 200)
        new_token = ok.json()["token"]
        self.assertNotEqual(new_token, self.token)

        # old token is dead, new token works, old password no longer logs in
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + new_token)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        self.client.credentials()
        self.assertEqual(self.client.post("/api/auth/login/", {"email": "abel@example.com", "password": "secret123"}).status_code, 400)
        self.assertEqual(self.client.post("/api/auth/login/", {"email": "abel@example.com", "password": "newsecret1"}).status_code, 200)

    def test_requires_login(self):
        self.client.credentials()
        self.assertEqual(self.client.patch("/api/auth/me/", {"name": "Abel"}, format="json").status_code, 401)
        self.assertEqual(self.client.post("/api/auth/change-password/", {}, format="json").status_code, 401)
