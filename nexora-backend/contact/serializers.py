from rest_framework import serializers

from .models import ContactMessage


class ContactMessageSerializer(serializers.ModelSerializer):
    name = serializers.CharField(min_length=2, max_length=100)
    message = serializers.CharField(min_length=5, max_length=2000)

    class Meta:
        model = ContactMessage
        fields = ["name", "email", "message"]  # only these can be set by the visitor
