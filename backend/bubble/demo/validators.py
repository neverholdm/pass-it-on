import re

CONTACT_DETAIL = re.compile(
    r"(?:https?://|www\.)\S+|\b[^\s@]+@[^\s@]+\.[^\s@]+\b|"
    r"(?<!\w)(?:\+?\d[\d ().-]{7,}\d)(?!\w)",
    re.IGNORECASE,
)


def contains_contact_details(value: str) -> bool:
    return bool(CONTACT_DETAIL.search(value))
