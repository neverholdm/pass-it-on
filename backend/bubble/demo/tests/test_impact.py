from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from bubble.bookings.models import Booking, BookingStatus
from bubble.demo.constants import DEMO_MARKER
from bubble.demo.management.commands.reset_demo import reset_demo_data
from bubble.items.models import Item, ItemStatus, SalesType


@override_settings(DEBUG=True, PASS_IT_ON_DEMO_MODE=True)
class DemoImpactTests(TestCase):
    def setUp(self):
        reset_demo_data()
        self.giver = get_user_model().objects.get(username="pass-it-on-giver")
        self.applicant = get_user_model().objects.get(username="pass-it-on-applicant")
        self.client = APIClient()
        self.client.force_authenticate(user=self.applicant)

    def test_impact_counts_only_completed_marked_giveaways_and_deduplicates_people(
        self,
    ):
        initial = self.client.get("/api/demo/impact/")
        self.assertEqual(initial.status_code, 200)
        self.assertTrue(initial.data["simulated"])
        self.assertEqual(initial.data["completed_giveaways"], 1)
        self.assertEqual(initial.data["participants"], 2)

        pending_item = Item.objects.create(
            user=self.giver,
            name="Unfinished box",
            category="other",
            description="A fictional unfinished hand-off.",
            sales_type=SalesType.DONATE,
            status=ItemStatus.AVAILABLE,
            properties={DEMO_MARKER: True},
        )
        Booking.objects.create(
            item=pending_item, user=self.applicant, status=BookingStatus.PENDING
        )
        pending_stats = self.client.get("/api/demo/impact/")
        self.assertEqual(pending_stats.data["completed_giveaways"], 1)
        self.assertEqual(pending_stats.data["participants"], 2)

        another_item = Item.objects.create(
            user=self.giver,
            name="Another passed-on item",
            category="other",
            description="A second fictional completed hand-off.",
            sales_type=SalesType.DONATE,
            status=ItemStatus.SOLD,
            properties={DEMO_MARKER: True},
        )
        Booking.objects.create(
            item=another_item, user=self.applicant, status=BookingStatus.COMPLETED
        )
        completed_stats = self.client.get("/api/demo/impact/")
        self.assertEqual(completed_stats.data["completed_giveaways"], 2)
        self.assertEqual(completed_stats.data["participants"], 2)

        reset_demo_data()
        reset_stats = self.client.get("/api/demo/impact/")
        self.assertEqual(reset_stats.data["completed_giveaways"], 1)
        self.assertEqual(reset_stats.data["participants"], 2)
