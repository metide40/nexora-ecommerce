from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import ContactMessageSerializer


class ContactView(APIView):
    """
    POST /api/contact/  {name, email, message}   (public, rate limited)
    Saves the message so the admin can read it at /admin/contact/contactmessage/
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact"  # limit set in settings: stops spam bots

    def post(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Message received."}, status=status.HTTP_201_CREATED)
