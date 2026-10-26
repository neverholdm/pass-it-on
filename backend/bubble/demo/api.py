"""Small, demo-scoped API for the Pass It On flow."""

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bubble.bookings.models import Booking, BookingStatus
from bubble.comments.models import Comment
from bubble.demo.constants import DEMO_MARKER
from bubble.demo.exceptions import (
    DemoActionDenied,
    DemoActionUnavailableError,
    DemoApplicantOnly,
    DemoGiverOnly,
    DemoIdentityRequired,
)
from bubble.demo.identity import is_demo_user
from bubble.demo.management.commands.reset_demo import reset_demo_data
from bubble.demo.serializers import (
    DemoActivitySerializer,
    DemoApplySerializer,
    DemoBookingSerializer,
    DemoCommentCreateSerializer,
    DemoCommentSerializer,
    DemoImpactSerializer,
    DemoItemCreateSerializer,
    DemoItemDetailsSerializer,
    DemoItemSerializer,
    DemoResetSerializer,
)
from bubble.demo.validators import contains_contact_details
from bubble.items.models import (
    CategoryType,
    Item,
    ItemStatus,
    SalesType,
    VisibilityType,
)

ACTIVE_APPLICATION_STATUSES = (BookingStatus.PENDING, BookingStatus.CONFIRMED)


def _require_demo_user(user):
    if not settings.DEBUG or not getattr(settings, "PASS_IT_ON_DEMO_MODE", False):
        raise Http404
    if not is_demo_user(user):
        raise DemoIdentityRequired


def _demo_items():
    return Item.objects.filter(properties__pass_it_on_demo=True).select_related("user")


def _item_payload(item, user):
    status = {
        ItemStatus.AVAILABLE: "Available",
        ItemStatus.RESERVED: "Reserved",
        ItemStatus.SOLD: "Completed",
    }.get(item.status, item.get_status_display())
    return {
        "id": str(item.pk),
        "name": item.name,
        "category": item.category,
        "description": item.description,
        "status": status,
        "owner": item.user.name or item.user.username,
        "is_free": item.sales_type == SalesType.DONATE and item.price is None,
        "can_apply": (item.status == ItemStatus.AVAILABLE and item.user_id != user.pk),
    }


@extend_schema(
    methods=["GET"],
    responses={200: DemoItemSerializer(many=True)},
    parameters=[
        OpenApiParameter(
            "search",
            OpenApiTypes.STR,
            OpenApiParameter.QUERY,
            description="Case-insensitive match in the item name or description.",
        ),
        OpenApiParameter(
            "category",
            OpenApiTypes.STR,
            OpenApiParameter.QUERY,
            description="Filter by item category.",
        ),
    ],
    operation_id="demoItemsList",
)
@extend_schema(
    methods=["POST"],
    request=DemoItemCreateSerializer,
    responses={201: DemoItemSerializer},
    operation_id="demoItemCreate",
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def demo_items(request):
    _require_demo_user(request.user)
    if request.method == "POST":
        name = str(request.data.get("name", "")).strip()
        description = str(request.data.get("description", "")).strip()
        category = str(request.data.get("category", "")).strip().lower()
        valid_categories = {value for value, _label in CategoryType.choices}
        errors = {}
        if not name:
            errors["name"] = "Enter an item name."
        if not description:
            errors["description"] = "Enter a description."
        if category not in valid_categories:
            errors["category"] = "Choose a valid category."
        if errors:
            raise ValidationError(errors)
        item = Item.objects.create(
            user=request.user,
            name=name,
            description=description,
            category=category,
            sales_type=SalesType.DONATE,
            price=None,
            status=ItemStatus.AVAILABLE,
            visibility=VisibilityType.AUTHENTICATED,
            internal=False,
            display_contact=False,
            properties={DEMO_MARKER: True},
        )
        return Response(_item_payload(item, request.user), status=201)

    items = _demo_items().filter(
        status__in=(ItemStatus.AVAILABLE, ItemStatus.RESERVED, ItemStatus.SOLD)
    )
    search = str(request.query_params.get("search", "")).strip()
    category = str(request.query_params.get("category", "")).strip().lower()
    if search:
        items = items.filter(
            Q(name__icontains=search) | Q(description__icontains=search)
        )
    if category:
        items = items.filter(category=category)
    return Response([_item_payload(item, request.user) for item in items])


class DemoItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: DemoItemDetailsSerializer},
        operation_id="demoItemRetrieve",
    )
    def get(self, request, item_id):
        _require_demo_user(request.user)
        item = get_object_or_404(_demo_items(), pk=item_id)
        comments = Comment.objects.filter(item=item).select_related("user")
        return Response(
            {
                **_item_payload(item, request.user),
                "comments": [
                    {
                        "id": str(comment.pk),
                        "body": comment.body,
                        "author": comment.user.name or comment.user.username,
                        "created_at": comment.created_at,
                    }
                    for comment in comments
                ],
            }
        )

    @extend_schema(
        request=None,
        responses={204: None},
        operation_id="demoItemDelete",
    )
    def delete(self, request, item_id):
        _require_demo_user(request.user)
        item = get_object_or_404(_demo_items(), pk=item_id)
        if item.user_id != request.user.pk:
            raise DemoGiverOnly
        item.delete()
        return Response(status=204)


@extend_schema(
    request=None,
    responses={201: DemoApplySerializer},
    operation_id="demoItemApply",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def demo_item_apply(request, item_id):
    _require_demo_user(request.user)
    with transaction.atomic():
        item = get_object_or_404(_demo_items().select_for_update(), pk=item_id)
        if item.user_id == request.user.pk:
            raise DemoActionDenied
        if item.status != ItemStatus.AVAILABLE:
            raise DemoActionUnavailableError
        active = Booking.objects.filter(
            item=item, user=request.user, status__in=ACTIVE_APPLICATION_STATUSES
        )
        if active.exists():
            raise DemoActionUnavailableError
        booking = Booking.objects.create(
            item=item, user=request.user, status=BookingStatus.PENDING, offer=None
        )
    return Response({"id": str(booking.pk), "status": "Pending"}, status=201)


@extend_schema(
    request=DemoCommentCreateSerializer,
    responses={201: DemoCommentSerializer},
    operation_id="demoCommentCreate",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_comment(request):
    _require_demo_user(request.user)
    item_id = request.data.get("item")
    body = str(request.data.get("body", "")).strip()
    item = get_object_or_404(_demo_items(), pk=item_id)
    if not body:
        raise ValidationError({"body": "Write a message before posting."})
    if contains_contact_details(body):
        raise ValidationError(
            {"body": "Please keep contact details out of public messages."}
        )
    comment = Comment.objects.create(item=item, user=request.user, body=body)
    return Response(
        {
            "id": str(comment.pk),
            "body": comment.body,
            "author": request.user.name or request.user.username,
            "created_at": comment.created_at,
        },
        status=201,
    )


def _booking_payload(booking, current_user):
    return {
        "id": str(booking.pk),
        "item": _item_payload(booking.item, current_user),
        "applicant": booking.user.name or booking.user.username,
        "applicant_id": str(booking.user_id),
        "status": booking.get_status_display(),
        "status_code": booking.status,
        "created_at": booking.created_at,
    }


@extend_schema(
    responses={200: DemoActivitySerializer},
    operation_id="demoActivityRetrieve",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def activity(request):
    _require_demo_user(request.user)
    owned_items = list(_demo_items().filter(user=request.user))
    owned_item_ids = [item.pk for item in owned_items]
    applications = Booking.objects.filter(
        user=request.user, item__properties__pass_it_on_demo=True
    ).select_related("item", "item__user", "user")
    received = Booking.objects.filter(item_id__in=owned_item_ids).select_related(
        "item", "item__user", "user"
    )
    return Response(
        {
            "identity": request.user.username,
            "items": [_item_payload(item, request.user) for item in owned_items],
            "applications": [
                _booking_payload(row, request.user) for row in applications
            ],
            "received": [_booking_payload(row, request.user) for row in received],
        }
    )


def _approve_application(request, booking, item):
    if request.user != item.user:
        raise DemoGiverOnly
    if booking.status != BookingStatus.PENDING or item.status != ItemStatus.AVAILABLE:
        raise DemoActionUnavailableError
    booking.status = BookingStatus.CONFIRMED
    booking.accepted_by = request.user
    booking.save(update_fields=["status", "accepted_by", "updated_at"])
    item.status = ItemStatus.RESERVED
    item.save(update_fields=["status", "updated_at"])


def _reject_application(request, booking, item):
    if request.user != item.user:
        raise DemoGiverOnly
    if booking.status != BookingStatus.PENDING:
        raise DemoActionUnavailableError
    booking.status = BookingStatus.REJECTED
    booking.accepted_by = request.user
    booking.save(update_fields=["status", "accepted_by", "updated_at"])


def _cancel_application(request, booking, item):
    if request.user not in (item.user, booking.user):
        raise DemoActionDenied
    if booking.status not in ACTIVE_APPLICATION_STATUSES:
        raise DemoActionUnavailableError
    was_approved = booking.status == BookingStatus.CONFIRMED
    booking.status = BookingStatus.CANCELLED
    booking.save(update_fields=["status", "updated_at"])
    if was_approved and item.status == ItemStatus.RESERVED:
        item.status = ItemStatus.AVAILABLE
        item.save(update_fields=["status", "updated_at"])


def _confirm_received(request, booking, item):
    if request.user != booking.user:
        raise DemoApplicantOnly
    if booking.status == BookingStatus.COMPLETED:
        return
    if booking.status != BookingStatus.CONFIRMED:
        raise DemoActionUnavailableError
    booking.status = BookingStatus.COMPLETED
    booking.save(update_fields=["status", "updated_at"])
    item.status = ItemStatus.SOLD
    item.save(update_fields=["status", "updated_at"])
    Booking.objects.filter(item=item, status=BookingStatus.PENDING).exclude(
        pk=booking.pk
    ).update(status=BookingStatus.REJECTED)


ACTION_HANDLERS = {
    "approve": _approve_application,
    "reject": _reject_application,
    "cancel": _cancel_application,
    "confirm-received": _confirm_received,
}


@extend_schema(
    request=None,
    responses={200: DemoBookingSerializer},
    operation_id="demoBookingAction",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def activity_action(request, booking_id, action):
    _require_demo_user(request.user)
    action_handler = ACTION_HANDLERS.get(action)
    if action_handler is None:
        raise Http404
    with transaction.atomic():
        booking = get_object_or_404(
            Booking.objects.select_for_update(of=("self",)).select_related(
                "item", "item__user", "user"
            ),
            pk=booking_id,
            item__properties__pass_it_on_demo=True,
        )
        item = Item.objects.select_for_update().get(pk=booking.item_id)
        booking.item = item
        action_handler(request, booking, item)
        if action == "confirm-received" and booking.status == BookingStatus.COMPLETED:
            return Response(_booking_payload(booking, request.user))
    booking.refresh_from_db()
    return Response(_booking_payload(booking, request.user))


@extend_schema(
    responses={200: DemoImpactSerializer},
    operation_id="demoImpactRetrieve",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def impact(request):
    _require_demo_user(request.user)
    completed = Booking.objects.filter(
        item__properties__pass_it_on_demo=True,
        item__sales_type=SalesType.DONATE,
        status=BookingStatus.COMPLETED,
        user__isnull=False,
    ).select_related("item", "item__user", "user")
    participants = set()
    for booking in completed:
        participants.add(booking.item.user_id)
        participants.add(booking.user_id)
    return Response(
        {
            "simulated": True,
            "completed_giveaways": completed.count(),
            "participants": len(participants),
        }
    )


@extend_schema(
    request=None,
    responses={200: DemoResetSerializer},
    operation_id="demoResetCreate",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reset_demo(request):
    _require_demo_user(request.user)
    if request.user.username != "pass-it-on-giver":
        raise DemoGiverOnly
    reset_demo_data()
    return Response({"reset": True})
