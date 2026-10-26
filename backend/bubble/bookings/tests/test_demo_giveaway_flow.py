from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from bubble.bookings.models import Booking, BookingStatus
from bubble.demo.constants import DEMO_GROUP_NAME, DEMO_MARKER
from bubble.items.models import Item, ItemStatus, SalesType, VisibilityType


@override_settings(DEBUG=True, PASS_IT_ON_DEMO_MODE=True)
class DemoGiveawayFlowTests(TestCase):
    def setUp(self):
        self.group, _ = Group.objects.get_or_create(name=DEMO_GROUP_NAME)
        user_model = get_user_model()
        self.giver = user_model.objects.create_user(
            username="flow-giver", email="flow-giver@example.test", name="Flow Giver"
        )
        self.applicant = user_model.objects.create_user(
            username="flow-applicant",
            email="flow-applicant@example.test",
            name="Flow Applicant",
        )
        self.other_applicant = user_model.objects.create_user(
            username="flow-other",
            email="flow-other@example.test",
            name="Other Applicant",
        )
        for user in (self.giver, self.applicant, self.other_applicant):
            user.groups.add(self.group)
        self.item = Item.objects.create(
            user=self.giver,
            name="Flow Table",
            category="furniture",
            description="A fictional table for a test.",
            sales_type=SalesType.DONATE,
            price=None,
            status=ItemStatus.AVAILABLE,
            visibility=VisibilityType.AUTHENTICATED,
            properties={DEMO_MARKER: True},
        )
        self.client = APIClient()

    def test_required_fields_and_public_comment_contact_filter(self):
        self.client.force_authenticate(user=self.giver)
        missing = self.client.post("/api/demo/items/", {}, format="json")
        self.assertEqual(missing.status_code, 400)

        created = self.client.post(
            "/api/demo/items/",
            {
                "name": "A free bowl",
                "category": "kitchen",
                "description": "A fictional ceramic bowl.",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["status"], "Available")
        self.assertTrue(created.data["is_free"])

        self.client.force_authenticate(user=self.applicant)
        contact = self.client.post(
            "/api/demo/comments/",
            {"item": str(self.item.pk), "body": "Email me at demo@example.test"},
            format="json",
        )
        self.assertEqual(contact.status_code, 400)
        comment = self.client.post(
            "/api/demo/comments/",
            {"item": str(self.item.pk), "body": "Would this fit beside a small desk?"},
            format="json",
        )
        self.assertEqual(comment.status_code, 201, comment.data)
        details = self.client.get(f"/api/demo/items/{self.item.pk}/")
        self.assertEqual(len(details.data["comments"]), 1)
        self.assertEqual(
            details.data["comments"][0]["body"], "Would this fit beside a small desk?"
        )

        direct_comment = self.client.post(
            "/api/comments/",
            {"item": str(self.item.pk), "body": "Call +1 (555) 123-4567"},
            format="json",
        )
        self.assertEqual(direct_comment.status_code, 400)

    def test_apply_approval_and_received_confirmation_are_server_checked_and_idempotent(
        self,
    ):
        self.client.force_authenticate(user=self.giver)
        self.assertEqual(
            self.client.post(f"/api/demo/items/{self.item.pk}/apply/").status_code,
            403,
        )

        self.client.force_authenticate(user=self.applicant)
        applied = self.client.post(f"/api/demo/items/{self.item.pk}/apply/")
        self.assertEqual(applied.status_code, 201, applied.data)
        duplicate = self.client.post(f"/api/demo/items/{self.item.pk}/apply/")
        duplicate_again = self.client.post(f"/api/demo/items/{self.item.pk}/apply/")
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(duplicate_again.status_code, 400)
        booking_id = applied.data["id"]
        self.assertEqual(
            Booking.objects.filter(item=self.item, user=self.applicant).count(), 1
        )

        self.assertEqual(
            self.client.post(f"/api/demo/activity/{booking_id}/approve/").status_code,
            403,
        )
        self.client.force_authenticate(user=self.giver)
        approved = self.client.post(f"/api/demo/activity/{booking_id}/approve/")
        self.assertEqual(approved.status_code, 200, approved.data)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, ItemStatus.RESERVED)

        self.client.force_authenticate(user=self.applicant)
        completed = self.client.post(
            f"/api/demo/activity/{booking_id}/confirm-received/"
        )
        repeated = self.client.post(
            f"/api/demo/activity/{booking_id}/confirm-received/"
        )
        repeated_again = self.client.post(
            f"/api/demo/activity/{booking_id}/confirm-received/"
        )
        self.assertEqual(completed.status_code, 200, completed.data)
        self.assertEqual(repeated.status_code, 200, repeated.data)
        self.assertEqual(repeated_again.status_code, 200, repeated_again.data)
        self.assertEqual(Booking.objects.filter(pk=booking_id).count(), 1)
        self.assertEqual(
            Booking.objects.get(pk=booking_id).status, BookingStatus.COMPLETED
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, ItemStatus.SOLD)
        impact = self.client.get("/api/demo/impact/")
        self.assertEqual(impact.status_code, 200)
        self.assertEqual(impact.data["completed_giveaways"], 1)

    def test_cancelling_approved_application_reopens_item_and_preserves_other_pending(
        self,
    ):
        first = Booking.objects.create(
            item=self.item, user=self.applicant, status=BookingStatus.PENDING
        )
        second = Booking.objects.create(
            item=self.item, user=self.other_applicant, status=BookingStatus.PENDING
        )
        self.client.force_authenticate(user=self.giver)
        self.assertEqual(
            self.client.post(f"/api/demo/activity/{first.pk}/approve/").status_code,
            200,
        )
        self.assertEqual(
            self.client.post(f"/api/demo/activity/{first.pk}/cancel/").status_code,
            200,
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, ItemStatus.AVAILABLE)
        self.assertEqual(
            Booking.objects.get(pk=first.pk).status, BookingStatus.CANCELLED
        )
        self.assertEqual(
            Booking.objects.get(pk=second.pk).status, BookingStatus.PENDING
        )

    def test_decline_and_pending_cancel_leave_item_available(self):
        booking = Booking.objects.create(
            item=self.item, user=self.applicant, status=BookingStatus.PENDING
        )
        self.client.force_authenticate(user=self.giver)
        self.assertEqual(
            self.client.post(f"/api/demo/activity/{booking.pk}/reject/").status_code,
            200,
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, ItemStatus.AVAILABLE)
