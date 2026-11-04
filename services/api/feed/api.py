"""Endpointy feedu.

Stronicowanie kursorem, nie numerem strony: feed rośnie od góry i przy
nowych wpisach numeracja dawałaby powtórzenia i ubytki — patrz komentarz
przy `Page<T>` w `packages/core/src/api.ts`.

Kursor jest nieprzezroczysty dla klienta i koduje moment oraz identyfikator
ostatniego wpisu. Dzięki temu dwa wpisy o tym samym znaczniku czasu nie
gubią się nawzajem.
"""

import base64
import binascii
import uuid

from django.db import IntegrityError, transaction
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from accounts.api import current_user
from accounts.audit import record
from accounts.permissions import can
from accounts.schemas import ErrorOut

from .models import BODY_MAX_LENGTH, Follow, Like, Post
from .schemas import CountersOut, CreatePostIn, LikeOut, PostOut

router = Router(tags=["feed"])

DEFAULT_LIMIT = 20
MAX_LIMIT = 50


def _encode_cursor(post: Post) -> str:
    raw = f"{post.created_at.isoformat()}|{post.id}"
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii")


def _decode_cursor(cursor: str) -> tuple[object, uuid.UUID] | None:
    """Rozkodowuje kursor. Kursor uszkodzony to błąd żądania, nie 500:
    pochodzi od klienta, więc serwer ma prawo go odrzucić i powiedzieć dlaczego."""
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("ascii")).decode("utf-8")
        moment, identifier = raw.split("|", 1)
        parsed = timezone.datetime.fromisoformat(moment)
        return parsed, uuid.UUID(identifier)
    except (binascii.Error, ValueError, UnicodeDecodeError):
        return None


def _counters(post: Post) -> dict:
    return {
        "likes": post.like_count,
        "comments": post.comment_count,
        "reposts": post.repost_count,
        "bookmarks": post.bookmark_count,
        "views": post.view_count,
    }


def _serialize(post: Post, viewer_id: uuid.UUID | None = None) -> dict:
    return {
        "id": str(post.id),
        "authorId": str(post.reposted_by_id or post.author_id),
        # Puste `body` oddajemy jako `null`, bo tak mówi kontrakt: brak tekstu
        # to brak, a nie pusty łańcuch do wyświetlenia.
        "body": post.body or None,
        "media": None,
        "tags": post.tags or [],
        "audioDescription": None,
        "trackId": None,
        "counters": _counters(post),
        "repostedBy": str(post.reposted_by_id) if post.reposted_by_id else None,
        "createdAt": post.created_at,
    }


def _like_count_for(post: Post, viewer_id: uuid.UUID | None) -> bool:
    if viewer_id is None:
        return False
    return Like.objects.filter(post=post, user_id=viewer_id).exists()


def _viewer_id(request) -> uuid.UUID | None:
    """Identyfikator zalogowanego użytkownika albo `None`.

    Feed jest publiczny do czytania — gość ma prawo zobaczyć wpisy. Ale
    `current_user` rzuca 401, więc nie wolno go tu wołać bezwarunkowo:
    odczyt sesji jest osobny od wymogu sesji.
    """
    identity_id = request.session.get("identity_id")
    if not identity_id:
        return None
    try:
        return uuid.UUID(str(identity_id))
    except ValueError:
        return None


@router.get("/posts", response={200: dict, 400: ErrorOut})
def list_posts(request, limit: int = DEFAULT_LIMIT, cursor: str | None = None, filter: str | None = None):
    """Lista wpisów z kursorem.

    `filter` przyjmuje `following` albo `explore`. Wartość nieznana jest
    odrzucana, a nie po cichu traktowana jak brak filtra — cichy fallback
    sprawiłby, że literówka w interfejsie dawałaby inne wyniki bez śladu.
    """
    if filter not in (None, "following", "explore"):
        raise HttpError(
            400,
            {"code": "bad_request", "message": "Nieznany filtr feedu.", "field": "filter"},
        )

    viewer_id = _viewer_id(request)
    wanted = max(1, min(limit, MAX_LIMIT))

    query = Post.objects.select_related("author", "reposted_by")

    if filter == "following":
        if viewer_id is None:
            # Bez sesji nie ma kogo obserwować. Pusta lista jest tu poprawną
            # odpowiedzią — a nie 401, bo czytanie feedu nie wymaga konta.
            return 200, {"items": [], "nextCursor": None}
        followed_ids = Follow.objects.filter(follower_id=viewer_id).values_list(
            "followed_id", flat=True
        )
        query = query.filter(author_id__in=list(followed_ids))

    # Kolejność musi być ustalona w obu kolumnach: sam czas nie rozstrzyga
    # dwóch wpisów z tej samej sekundy, a wtedy kursor przeskakiwałby wpisy.
    query = query.order_by("-created_at", "-id")

    if cursor:
        decoded = _decode_cursor(cursor)
        if decoded is None:
            raise HttpError(
                400,
                {"code": "bad_request", "message": "Kursor jest nieprawidłowy.", "field": "cursor"},
            )
        moment, identifier = decoded
        query = query.filter(
            # Pary leksykograficznie mniejsze od pozycji kursora.
            models_q_less_than(moment, identifier)
        )

    # Jedno więcej niż potrzeba — obecność dodatkowego wpisu mówi, czy jest
    # następna strona. Bez tego trzeba by zgadywać po długości listy.
    rows = list(query[: wanted + 1])
    has_more = len(rows) > wanted
    page = rows[:wanted]

    return 200, {
        "items": [_serialize(post, viewer_id) for post in page],
        "nextCursor": _encode_cursor(page[-1]) if has_more and page else None,
    }


def models_q_less_than(moment, identifier):
    """Warunek „wpis jest dalej w feedzie niż kursor”.

    Trzymany w funkcji, bo ta sama logika jest potrzebna w dwóch miejscach
    i rozjazd między nimi dawałby powtórzone albo pominięte wpisy.
    """
    from django.db.models import Q

    return Q(created_at__lt=moment) | Q(created_at=moment, id__lt=str(identifier))


@router.post("/posts", response={201: PostOut, 400: ErrorOut, 401: ErrorOut, 403: ErrorOut})
def create_post(request, payload: CreatePostIn):
    user = current_user(request)

    if not can(user.effective_roles(), "post.create"):
        raise HttpError(
            403,
            {"code": "forbidden", "message": "Twoja rola nie pozwala publikować wpisów."},
        )

    body = (payload.body or "").strip()
    if not body:
        raise HttpError(
            400, {"code": "bad_request", "message": "Wpis nie może być pusty.", "field": "body"}
        )
    if len(body) > BODY_MAX_LENGTH:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": f"Opis wpisu może mieć najwyżej {BODY_MAX_LENGTH} znaków.",
                "field": "body",
            },
        )

    # Tagi: bez pustych pozycji, bez duplikatów, z ograniczeniem długości.
    # Kolejność zachowana, bo w interfejsie ma znaczenie.
    tags: list[str] = []
    for tag in payload.tags or []:
        clean = tag.strip().lower()[:32]
        if clean and clean not in tags:
            tags.append(clean)
    if len(tags) > 5:
        raise HttpError(
            400, {"code": "bad_request", "message": "Najwyżej 5 tagów na wpis.", "field": "tags"}
        )

    post = Post.objects.create(author=user, body=body, tags=tags)
    record(user, "feed.post.create", resource=str(post.id))
    return 201, _serialize(post, user.id)


@router.post("/posts/{post_id}/like", response={200: LikeOut, 401: ErrorOut, 404: ErrorOut})
def like_post(request, post_id: str):
    """Polubienie. Licznik zmienia się w tej samej transakcji co rekord,
    więc nie ma stanu, w którym polubienie istnieje, a licznik go nie widzi.
    """
    user = current_user(request)
    post = Post.objects.filter(id=post_id).first()
    if post is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego wpisu."})

    with transaction.atomic():
        try:
            Like.objects.create(user=user, post=post)
        except IntegrityError:
            # Polubienie już było. Nie jest to błąd — operacja jest
            # idempotentna, więc wracamy z aktualnym stanem.
            pass
        else:
            Post.objects.filter(id=post.id).update(like_count=models_f_increment())
        post.refresh_from_db()

    return 200, {"liked": True, "counters": _counters(post)}


@router.delete("/posts/{post_id}/like", response={200: LikeOut, 401: ErrorOut, 404: ErrorOut})
def unlike_post(request, post_id: str):
    user = current_user(request)
    post = Post.objects.filter(id=post_id).first()
    if post is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego wpisu."})

    with transaction.atomic():
        deleted, _ = Like.objects.filter(user=user, post=post).delete()
        if deleted:
            # `like_count` nie schodzi pod zero, nawet gdyby stan bazy był
            # niespójny — licznik ujemny to widoczny błąd na ekranie.
            Post.objects.filter(id=post.id, like_count__gt=0).update(
                like_count=models_f_decrement()
            )
        post.refresh_from_db()

    return 200, {"liked": False, "counters": _counters(post)}


def models_f_increment():
    from django.db.models import F

    return F("like_count") + 1


def models_f_decrement():
    from django.db.models import F

    return F("like_count") - 1
