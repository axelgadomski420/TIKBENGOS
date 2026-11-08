"""
Modele marketplace BENGOS.

Cena w groszach (IntegerField). Float na pieniądzach jest błędem.
seller i buyer to AUTH_USER_MODEL — jeden model użytkownika.
asset_ref to klucz w magazynie obiektów, nigdy ścieżka na dysku.
"""

from django.conf import settings
from django.db import models


class MarketItem(models.Model):
    class Kind(models.TextChoices):
        PRESET = "preset", "Preset"
        SOUND = "sound", "Sound"
        VIDEO_TEMPLATE = "video-template", "Video template"
        MUSIC = "music", "Music"
        CODE_PROJECT = "code-project", "Code project"
        CAPTION_PACK = "caption-pack", "Caption pack"
        MODEL = "model", "Model"

    class State(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        SUSPENDED = "suspended", "Suspended"

    class License(models.TextChoices):
        PERSONAL = "personal", "Personal"
        COMMERCIAL = "commercial", "Commercial"
        EXTENDED = "extended", "Extended"

    id = models.CharField(primary_key=True, max_length=32)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="market_items")
    kind = models.CharField(max_length=32, choices=Kind.choices)
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=200)
    description = models.TextField()
    price_minor = models.PositiveIntegerField()  # grosze
    currency = models.CharField(max_length=3, default="PLN")
    state = models.CharField(max_length=16, choices=State.choices, default=State.DRAFT)
    preview_url = models.URLField(blank=True, null=True)
    asset_ref = models.CharField(max_length=512)
    license = models.CharField(max_length=16, choices=License.choices, default=License.PERSONAL)
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]


class MarketPurchase(models.Model):
    class State(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        REFUNDED = "refunded", "Refunded"
        FAILED = "failed", "Failed"

    class Provider(models.TextChoices):
        STRIPE = "stripe", "Stripe"
        PAYU = "payu", "PayU"
        MANUAL = "manual", "Manual"

    id = models.CharField(primary_key=True, max_length=32)
    item = models.ForeignKey(MarketItem, on_delete=models.PROTECT, related_name="purchases")
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="market_purchases")
    amount_minor = models.PositiveIntegerField()
    currency = models.CharField(max_length=3)
    state = models.CharField(max_length=16, choices=State.choices, default=State.PENDING)
    provider = models.CharField(max_length=16, choices=Provider.choices, default=Provider.MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
