from django.urls import path

from bubble.demo.api import (
    DemoItemDetailView,
    activity,
    activity_action,
    create_comment,
    demo_item_apply,
    demo_items,
    impact,
    reset_demo,
)
from bubble.demo.identity import switch_identity

urlpatterns = [
    path("identity/", switch_identity, name="switch-identity"),
    path("items/", demo_items, name="items"),
    path(
        "items/<uuid:item_id>/",
        DemoItemDetailView.as_view(),
        name="item-detail",
    ),
    path("items/<uuid:item_id>/apply/", demo_item_apply, name="item-apply"),
    path("comments/", create_comment, name="comments"),
    path("activity/", activity, name="activity"),
    path(
        "activity/<uuid:booking_id>/<str:action>/",
        activity_action,
        name="activity-action",
    ),
    path("impact/", impact, name="impact"),
    path("reset/", reset_demo, name="reset"),
]
