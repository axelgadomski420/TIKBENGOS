"""Model wpisu feedu.

Krótki opis (`body`) ma limit 80 znaków — taki sam jak w modelu źródłowym
z TIKTAK. Liczniki są denormalizowane i aktualizowane w transakcji razem
ze zmianą polubienia, bo przeliczanie ich zapytaniem przy każdym odczycie
feedu to najdroższe, co można tu zrobić.

Reposty są dozwolone raz: para (autor podniesienia, wpis) jest unikalna,
bo drugie podniesienie tego samego wpisu nie znaczy nic nowego, a zaśmieca
feed.
"""

import uuid

from django.conf import settings
from django.db import models

BODY_MAX_LENGTH = 80


class Post(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="posts"
    )
    body = models.CharField(max_length=BODY_MAX_LENGTH, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)

    # Podniesienie wpisu przez kogoś innego. `reposted_by` jest autorem
    # podniesienia, a `created_at` czasem podniesienia — feed sortuje po nim.
    reposted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="reposts",
    )
    repost_of = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="reposts"
    )

    # Liczniki denormalizowane. `bookmarks` i `views` zostają na zero do
    # Etapu 2 — nie ma jeszcze ekranu zakładek ani liczenia odsłon, a licznik
    # rosnący „sam z siebie” byłby danym wymyślonym.
    like_count = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)
    repost_count = models.PositiveIntegerField(default=0)
    bookmark_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["reposted_by", "repost_of"],
                name="unique_repost_per_user_and_post",
                condition=models.Q(repost_of__isnull=False),
            )
        ]

    def __str__(self) -> str:  # pragma: no cover - wygoda w panelu
        return self.body or f"wpis {self.id}"


class Like(models.Model):
    """Polubienie. Unikalne dla pary (użytkownik, wpis).

    Bez tej tabeli licznik polubień dałoby się nabić dowolną liczbę razy
    jednym żądaniem — a licznik, który kłamie, jest gorszy niż brak licznika.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="likes"
    )
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "post"], name="unique_like_per_user_and_post")
        ]
        indexes = [models.Index(fields=["post", "-created_at"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user_id} → {self.post_id}"


class Follow(models.Model):
    """Obserwacja. Jedna para na raz, bez obserwowania samego siebie.

    Model istnieje już teraz, bo filtr „obserwowani” musi mieć z czego
    czytać, gdy feed ruszy — dolożenie go później zmieniłoby znaczenie
    istniejących zapytań o „twórców, których obserwujesz”.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="following"
    )
    followed = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="followers"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["follower", "followed"], name="unique_follow"),
            models.CheckConstraint(
                condition=~models.Q(follower=models.F("followed")),
                name="no_self_follow",
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.follower_id} → {self.followed_id}"
