from django.core.cache import cache
from rest_framework.test import APITestCase

from .models import ContactMessage

GOOD = {"name": "Abel", "email": "abel@example.com", "message": "Do you ship to Addis Ababa?"}


class ContactTests(APITestCase):
    def setUp(self):
        cache.clear()  # reset the rate-limit counter between tests

    def test_message_is_saved_unread(self):
        r = self.client.post("/api/contact/", GOOD, format="json")
        self.assertEqual(r.status_code, 201)
        m = ContactMessage.objects.get()
        self.assertEqual((m.email, m.is_read), ("abel@example.com", False))

    def test_validation(self):
        for bad in [{**GOOD, "email": "nope"}, {**GOOD, "name": ""}, {**GOOD, "message": "hi"}, {**GOOD, "message": "x" * 2001}]:
            self.assertEqual(self.client.post("/api/contact/", bad, format="json").status_code, 400)
        self.assertEqual(ContactMessage.objects.count(), 0)

    def test_visitor_cannot_set_admin_fields(self):
        self.client.post("/api/contact/", {**GOOD, "is_read": True, "admin_notes": "hack"}, format="json")
        m = ContactMessage.objects.get()
        self.assertFalse(m.is_read)
        self.assertEqual(m.admin_notes, "")

    def test_rate_limited_after_five(self):
        codes = [self.client.post("/api/contact/", GOOD, format="json").status_code for _ in range(6)]
        self.assertEqual(codes, [201] * 5 + [429])
