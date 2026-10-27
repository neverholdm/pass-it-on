"""Rebuild only the fictional records marked as belonging to this demo."""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction

from bubble.bookings.models import Booking, BookingStatus
from bubble.demo.constants import DEMO_GROUP_NAME, DEMO_MARKER
from bubble.items.models import Item, ItemStatus, SalesType, VisibilityType

IDENTITIES = {
    "pass-it-on-giver": ("Item Giver", "giver@example.test"),
    "pass-it-on-applicant": ("Item Requester", "applicant@example.test"),
}


@transaction.atomic
def reset_demo_data():
    """Delete and re-create marked giveaway data without touching other rows."""
    user_model = get_user_model()
    demo_group, _ = Group.objects.get_or_create(name=DEMO_GROUP_NAME)
    identities = {}
    for username, (name, email) in IDENTITIES.items():
        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={"name": name, "email": email, "is_active": True},
        )
        user.name = name
        user.email = email
        user.is_active = True
        fields = ["name", "email", "is_active"]
        if created:
            user.set_unusable_password()
            fields.append("password")
        user.save(update_fields=fields)
        user.groups.add(demo_group)
        identities[username] = user

    marked_items = Item.objects.filter(properties__pass_it_on_demo=True)
    marked_items.delete()

    giver = identities["pass-it-on-giver"]
    applicant = identities["pass-it-on-applicant"]

    def add_item(name, category, description, status):
        return Item.objects.create(
            user=giver,
            name=name,
            category=category,
            description=description,
            sales_type=SalesType.DONATE,
            price=None,
            status=status,
            visibility=VisibilityType.AUTHENTICATED,
            internal=False,
            display_contact=False,
            properties={DEMO_MARKER: True},
        )

    add_item(
        "Blue Ceramic Vase",
        "other",
        "A small fictional vase in good condition, ready for a new home.",
        ItemStatus.AVAILABLE,
    )
    pending_item = add_item(
        "Desk Lamp",
        "electronics",
        "A fictional adjustable desk lamp with a working bulb.",
        ItemStatus.AVAILABLE,
    )
    Booking.objects.create(
        item=pending_item,
        user=applicant,
        status=BookingStatus.PENDING,
        offer=None,
    )
    completed_item = add_item(
        "Oak Side Table",
        "furniture",
        "A fictional wooden side table already passed on in the sample story.",
        ItemStatus.SOLD,
    )
    Booking.objects.create(
        item=completed_item,
        user=applicant,
        status=BookingStatus.COMPLETED,
        offer=None,
        accepted_by=giver,
    )
    return {"items": 3, "identities": 2}


class Command(BaseCommand):
    help = "Reset the marked Pass It On demo accounts and fictional giveaway records."

    def handle(self, *args, **options):
        result = reset_demo_data()
        self.stdout.write(
            self.style.SUCCESS(
                f"Reset Pass It On demo: {result['items']} items, "
                f"{result['identities']} identities."
            )
        )
