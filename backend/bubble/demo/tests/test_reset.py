from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from bubble.bookings.models import Booking
from bubble.demo.management.commands.reset_demo import reset_demo_data
from bubble.items.models import Item, ItemStatus, SalesType


@override_settings(DEBUG=True, PASS_IT_ON_DEMO_MODE=True)
class DemoResetTests(TestCase):
    def setUp(self):
        reset_demo_data()
        self.giver = get_user_model().objects.get(username="pass-it-on-giver")
        self.applicant = get_user_model().objects.get(username="pass-it-on-applicant")
        self.other_user = get_user_model().objects.create_user(
            username="outside-demo", email="outside@example.test"
        )
        self.outside_item = Item.objects.create(
            user=self.other_user,
            name="Outside the demo",
            category="other",
            description="This record must survive the demo reset.",
            sales_type=SalesType.DONATE,
            status=ItemStatus.AVAILABLE,
            properties={"pass_it_on_demo": False},
        )

    def test_reset_rebuilds_only_marked_rows_and_is_repeatable(self):
        initial_ids = set(
            Item.objects.filter(properties__pass_it_on_demo=True).values_list(
                "pk", flat=True
            )
        )
        self.assertEqual(len(initial_ids), 3)
        reset_demo_data()
        once_ids = set(
            Item.objects.filter(properties__pass_it_on_demo=True).values_list(
                "pk", flat=True
            )
        )
        reset_demo_data()
        twice_ids = set(
            Item.objects.filter(properties__pass_it_on_demo=True).values_list(
                "pk", flat=True
            )
        )
        self.assertEqual(len(once_ids), 3)
        self.assertEqual(len(twice_ids), 3)
        self.assertNotEqual(initial_ids, once_ids)
        self.assertNotEqual(once_ids, twice_ids)
        self.assertTrue(Item.objects.filter(pk=self.outside_item.pk).exists())
        self.assertEqual(
            Booking.objects.filter(item__properties__pass_it_on_demo=True).count(), 2
        )
        statuses = set(
            Item.objects.filter(properties__pass_it_on_demo=True).values_list(
                "status", flat=True
            )
        )
        self.assertEqual(statuses, {ItemStatus.AVAILABLE, ItemStatus.SOLD})

    def test_only_giver_can_request_reset(self):
        client = APIClient()
        client.force_authenticate(user=self.applicant)
        response = client.post("/api/demo/reset/")
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Item.objects.filter(pk=self.outside_item.pk).exists())

        client.force_authenticate(user=self.giver)
        response = client.post("/api/demo/reset/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(Item.objects.filter(pk=self.outside_item.pk).exists())
