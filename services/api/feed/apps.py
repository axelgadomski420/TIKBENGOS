"""Aplikacja feedu — moduł BENGOS Feed.

Nazwa `feed` jest zgodna z prefiksem `/v1/feed` w kontrakcie API i z nazwą
modułu w interfejsie. Krótsza nazwa niż `bengos_feed` jest bezpieczna:
prefiks `/v1` oddziela przestrzenie nazw na poziomie adresów, a nie modułów.
"""

from django.apps import AppConfig


class FeedConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "feed"
    verbose_name = "Feed"
