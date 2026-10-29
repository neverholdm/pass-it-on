from django.contrib.auth.models import Group
from rest_framework import serializers

from bubble.demo.constants import DEMO_GROUP_NAME
from bubble.users.models import Profile, User


class GroupSerializer(serializers.ModelSerializer):
    """Serializer for auth Group model."""

    class Meta:
        model = Group
        fields = ["id", "name"]


class ProfileSerializer(serializers.ModelSerializer[Profile]):
    email = serializers.EmailField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    name = serializers.CharField(source="user.name", required=False, allow_blank=True)
    # Capability flags: the demo identities are real users, but they only belong
    # to the "Pass It On Demo" group, which carries no model permissions. The
    # frontend uses these flags to hide the regular app's entry points instead
    # of letting people walk into a 403.
    is_demo = serializers.SerializerMethodField()
    can_create_item = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "username",
            "name",
            "email",
            "phone",
            "matrix_id",
            "bio",
            "address",
            "email_reminder",
            "profile_image",
            "language",
            "pwa_install_dismissed",
            "is_demo",
            "can_create_item",
        ]

    def get_is_demo(self, obj: Profile) -> bool:
        """Whether this account is one of the seeded Pass It On demo identities."""
        return obj.user.groups.filter(name=DEMO_GROUP_NAME).exists()

    def get_can_create_item(self, obj: Profile) -> bool:
        """Whether the account may create items through the regular app."""
        return obj.user.has_perm("items.add_item")

    def update(self, instance, validated_data):
        # Pop user-level fields and update the related User object
        user_data = validated_data.pop("user", {})
        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save(update_fields=list(user_data.keys()))

        # Write-once: once the install prompt has been dismissed, nothing
        # should be able to bring it back for that account.
        if validated_data.get("pwa_install_dismissed") is False:
            validated_data.pop("pwa_install_dismissed")

        return super().update(instance, validated_data)


class UserSerializer(serializers.ModelSerializer[User]):
    class Meta:
        model = User
        fields = ["id", "username", "name", "email"]
