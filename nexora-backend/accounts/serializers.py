from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name")
    joined = serializers.DateTimeField(source="date_joined", read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "email", "joined"]


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    confirmPassword = serializers.CharField(write_only=True, required=False)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, data):
        if "confirmPassword" in data and data["password"] != data["confirmPassword"]:
            raise serializers.ValidationError({"confirmPassword": "Passwords do not match."})
        validate_password(data["password"])
        return data

    def create(self, validated):
        # Email doubles as the Django username, so login is by email.
        return User.objects.create_user(
            username=validated["email"],
            email=validated["email"],
            password=validated["password"],  # hashed automatically
            first_name=validated["name"],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data["email"].lower(), password=data["password"])
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        data["user"] = user
        return data


class ProfileUpdateSerializer(serializers.Serializer):
    """Only the name can be changed (the email is the login id)."""
    name = serializers.CharField(min_length=2, max_length=150)


class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(write_only=True)
    newPassword = serializers.CharField(write_only=True)
    confirmPassword = serializers.CharField(write_only=True, required=False)

    def validate_currentPassword(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, data):
        if "confirmPassword" in data and data["newPassword"] != data["confirmPassword"]:
            raise serializers.ValidationError({"confirmPassword": "Passwords do not match."})
        validate_password(data["newPassword"], self.context["request"].user)
        return data
