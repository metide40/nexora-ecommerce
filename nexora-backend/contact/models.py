from django.db import models


class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    message = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)  # admin ticks this after reading
    admin_notes = models.TextField(blank=True, help_text="Private notes (never shown to the customer)")

    class Meta:
        ordering = ["is_read", "-created_at"]  # unread first, newest first

    def __str__(self):
        return f"{self.name} <{self.email}> - {self.created_at:%Y-%m-%d}"
