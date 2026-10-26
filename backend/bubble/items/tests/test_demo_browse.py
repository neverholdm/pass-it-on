from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from bubble.demo.constants import DEMO_MARKER
from bubble.demo.management.commands.reset_demo import reset_demo_data
from bubble.items.models import Item, ItemStatus, SalesType


@override_settings(DEBUG=True, PASS_IT_ON_DEMO_MODE=True)
class DemoBrowseTests(TestCase):
    def setUp(self):
        reset_demo_data()
        self.giver = get_user_model().objects.get(username="pass-it-on-giver")
        self.client = APIClient()
        self.client.force_authenticate(user=self.giver)

    def test_search_trims_whitespace_and_matches_title_or_description(self):
        by_title = self.client.get("/api/demo/items/?search=%20%20lamp%20%20")
        self.assertEqual(by_title.status_code, 200)
        self.assertEqual([row["name"] for row in by_title.data], ["Desk Lamp"])

        by_description = self.client.get("/api/demo/items/?search=fictional%20wooden")
        self.assertEqual(
            [row["name"] for row in by_description.data], ["Oak Side Table"]
        )

    def test_category_and_keyword_filters_intersect_and_states_are_visible(self):
        combined = self.client.get(
            "/api/demo/items/?search=fictional&category=furniture"
        )
        self.assertEqual([row["name"] for row in combined.data], ["Oak Side Table"])
        self.assertEqual(combined.data[0]["status"], "Completed")

        mismatch = self.client.get("/api/demo/items/?search=lamp&category=books")
        self.assertEqual(mismatch.data, [])

        all_items = self.client.get("/api/demo/items/?search=%20")
        self.assertEqual(len(all_items.data), 3)
        self.assertEqual(
            {row["status"] for row in all_items.data},
            {"Available", "Completed"},
        )

    def test_unmarked_or_unpublished_records_do_not_appear(self):
        Item.objects.create(
            user=self.giver,
            name="Draft sample",
            category="other",
            description="Not published.",
            sales_type=SalesType.DONATE,
            status=ItemStatus.DRAFT,
            properties={DEMO_MARKER: True},
        )
        listed = self.client.get("/api/demo/items/")
        self.assertEqual(len(listed.data), 3)
