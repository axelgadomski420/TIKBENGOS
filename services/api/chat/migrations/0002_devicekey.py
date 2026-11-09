"""Klucze pieczęci czatu. Dodające — nie rusza istniejących wiadomości."""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("chat", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DeviceKey",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("public_jwk", models.TextField()),
                ("fingerprint", models.CharField(max_length=64)),
                ("prekeys", models.JSONField(default=list)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chat_device_key",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
