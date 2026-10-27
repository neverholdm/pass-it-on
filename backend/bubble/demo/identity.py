"""Loopback-only identity switching for the fictional local demo accounts."""

from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import get_user_model, login
from django.http import Http404
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from bubble.demo.constants import DEMO_GROUP_NAME
from bubble.demo.exceptions import DemoLocalOnly, DemoSessionRoleSwitchOnly
from bubble.demo.serializers import (
    DemoIdentityRequestSerializer,
    DemoIdentityResponseSerializer,
)

DEMO_IDENTITIES = {
    "giver": {"username": "pass-it-on-giver", "display_name": "Item Giver"},
    "applicant": {
        "username": "pass-it-on-applicant",
        "display_name": "Item Requester",
    },
}
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}
DEMO_IDENTITIES_NOT_INITIALIZED = (
    "Demo identities are not initialized. Run the reset_demo command."
)


def is_demo_user(user) -> bool:
    """Return whether a user belongs to the dedicated demo identity group."""
    return bool(
        getattr(user, "is_authenticated", False)
        and user.groups.filter(name=DEMO_GROUP_NAME).exists()
    )


def demo_display_name(user) -> str:
    """Return the role label used for demo identities, independent of seed data."""
    for identity in DEMO_IDENTITIES.values():
        if user.username == identity["username"]:
            return identity["display_name"]
    return user.name or user.username


def _ensure_demo_is_enabled() -> None:
    if not settings.DEBUG or not getattr(settings, "PASS_IT_ON_DEMO_MODE", False):
        raise Http404


def _ensure_loopback_origin(request) -> None:
    origin = request.headers.get("Origin", "")
    parsed = urlsplit(origin)
    if parsed.scheme not in {"http", "https"} or parsed.hostname not in LOCAL_HOSTS:
        raise DemoLocalOnly


@extend_schema(
    request=DemoIdentityRequestSerializer,
    responses={200: DemoIdentityResponseSerializer},
    operation_id="demoIdentitySwitch",
)
@api_view(["POST"])
@permission_classes([AllowAny])
def switch_identity(request):
    """Sign the local browser into one of the two seeded demo accounts."""
    _ensure_demo_is_enabled()
    _ensure_loopback_origin(request)

    if request.user.is_authenticated and not is_demo_user(request.user):
        raise DemoSessionRoleSwitchOnly

    identity_key = request.data.get("identity")
    identity = DEMO_IDENTITIES.get(identity_key)
    if identity is None:
        raise ValidationError({"identity": "Choose giver or applicant."})

    user_model = get_user_model()
    try:
        user = user_model.objects.get(username=identity["username"], is_active=True)
    except user_model.DoesNotExist as exc:
        raise ValidationError({"detail": DEMO_IDENTITIES_NOT_INITIALIZED}) from exc

    if not user.groups.filter(name=DEMO_GROUP_NAME).exists():
        raise ValidationError({"detail": DEMO_IDENTITIES_NOT_INITIALIZED})

    login(request, user, backend=settings.AUTHENTICATION_BACKENDS[0])
    return Response(
        {
            "identity": identity_key,
            "user": {
                "id": str(user.pk),
                "username": user.username,
            "display_name": identity["display_name"],
            },
        }
    )
