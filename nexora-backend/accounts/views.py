from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    ChangePasswordSerializer, LoginSerializer, ProfileUpdateSerializer, RegisterSerializer, UserSerializer,
)


def auth_response(user, http_status=status.HTTP_200_OK):
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": UserSerializer(user).data}, status=http_status)


class RegisterView(APIView):
    """POST /api/auth/register/  {name, email, password, confirmPassword}"""
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return auth_response(user, status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login/  {email, password}  ->  {token, user}"""
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return auth_response(serializer.validated_data["user"])


class LogoutView(APIView):
    """POST /api/auth/logout/  (send header  Authorization: Token <token>)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """
    GET   /api/auth/me/   the logged-in user (restores login on page load)
    PATCH /api/auth/me/   {name}  update the profile
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.first_name = serializer.validated_data["name"]
        request.user.save(update_fields=["first_name"])
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/  {currentPassword, newPassword, confirmPassword}
    Old tokens are revoked (other devices get logged out) and a fresh one is returned.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["newPassword"])
        user.save()
        Token.objects.filter(user=user).delete()
        return auth_response(user)
