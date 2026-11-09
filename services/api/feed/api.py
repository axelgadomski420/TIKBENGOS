"""Endpointy feedu.

Stronicowanie kursorem, nie numerem strony: feed rośnie od góry i przy
nowych wpisach numeracja dawałaby powtórzenia i ubytki — patrz komentarz
przy `Page<T>` w `packages/core/src/api.ts`.

Kursor jest nieprzezroczysty dla klienta i koduje moment oraz identyfikator
ostatniego wpisu. Dzięki temu dwa wpisy o tym samym znaczniku czasu nie
gubią się nawzajem.

Etap 2 dla tekstu zamykają obserwacje i podniesienia. Oba działają na
modelach, które istniały od początku (`Follow`, pola podniesienia w `Post`),
więc ta zmiana nie wprowadza żadnej migracji.
"""

import base64
import binascii
import uuid

from django.db import IntegrityError, transaction
from django.db.models import F, Q
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from accounts.api import current_user
from accounts.audit import record
from accounts.models import User
from accounts.permissions import can
from accounts.schemas import ErrorOut

from .models import BODY_MAX_LENGTH, COMMENT_MAX_LENGTH, MEDIA_MAX_LENGTH, Comment, Follow, Like, Post
from .schemas import (
    AuthorOut,
    CommentOut,
    CountersOut,
    CreateCommentIn,
    CreatePostIn,
    FollowOut,
    LikeOut,
    PostListOut,
    PostOut,
    RepostOut,
)

router = Router(tags=["feed"])

DEFAULT_LIMIT = 20
MAX_LIMIT = 50
COMMENT_LIMIT = 100


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


def _author(user: User) -> dict:
    """Autor w postaci publicznej. Nigdy nie zawiera adresu email."""
    return {
        "id": str(user.id),
        "username": user.username,
        "displayName": user.display_name or None,
        "avatarUrl": user.avatar_url or None,
    }


def _media(post: Post) -> dict | None:
    url = (post.media_url or "").strip()
    if not url:
        return None
    return {
        "id": str(post.id),
        "kind": "image",
        "renditions": [{"label": "obraz", "url": url, "width": 0, "height": 0, "bitrateKbps": 0}],
        "thumbnailUrl": url,
        "subtitles": None,
        "durationSeconds": None,
        "width": None,
        "height": None,
    }


def _serialize(post: Post, viewer_id: uuid.UUID | None = None) -> dict:
    """Wpis w postaci kontraktu.

    Podniesienie niesie treść ORYGINAŁU: feed czyta się od treści, a licznik
    podniesień mówi, że ktoś ją podniósł. `authorId` to autor oryginału,
    `repostedBy` — kto podniósł, `createdAt` — czas podniesienia (tak mówi
    kontrakt: feed sortuje podniesienia po czasie podniesienia).
    """
    origin = post.repost_of or post
    return {
        "id": str(post.id),
        "authorId": str(origin.author_id),
        # Puste `body` oddajemy jako `null`, bo tak mówi kontrakt: brak tekstu
        # to brak, a nie pusty łańcuch do wyświetlenia.
        "body": origin.body or None,
        "media": _media(origin),
        "tags": origin.tags or [],
        "audioDescription": (
            {"language": "pl", "text": origin.audio_description}
            if origin.audio_description
            else None
        ),
        "trackId": None,
        "counters": _counters(origin),
        "repostedBy": str(post.reposted_by_id) if post.reposted_by_id else None,
        "createdAt": post.created_at,
    }


def _liked_by_viewer(post: Post, viewer_id: uuid.UUID | None) -> bool:
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


def _post_queryset():
    return Post.objects.select_related("author", "reposted_by", "repost_of", "repost_of__author")


def _comment_queryset():
    return Comment.objects.select_related("author")


def _comments_for(post_id) -> list[dict]:
    """Komentarze wpisu w kolejności od najstarszego.

    Od najstarszego, a nie od najnowszego: komentarz pod wpisem czyta się
    jako rozmowę, a rozmowa idzie do przodu. `COMMENT_LIMIT` chroni przed
    wpisem, który ma tysiące odpowiedzi — pełna lista przyjdzie osobnym
    stronicowaniem, gdy będzie potrzebna.
    """
    rows = list(_comment_queryset().filter(post_id=post_id)[:COMMENT_LIMIT])
    return [
        {
            "id": str(row.id),
            "postId": str(row.post_id),
            "authorId": str(row.author_id),
            "parentCommentId": str(row.parent_comment_id) if row.parent_comment_id else None,
            "body": row.body,
            "likeCount": row.like_count,
            "createdAt": row.created_at,
        }
        for row in rows
    ]


def _models_q_less_than(moment, identifier):
    """Warunek „wpis jest dalej w feedzie niż kursor”.

    Trzymany w funkcji, bo ta sama logika jest potrzebna w dwóch miejscach
    i rozjazd między nimi dawałby powtórzone albo pominięte wpisy.
    """
    return Q(created_at__lt=moment) | Q(created_at=moment, id__lt=str(identifier))


@router.get("/posts", response={200: PostListOut, 400: ErrorOut})
def list_posts(
    request,
    limit: int = DEFAULT_LIMIT,
    cursor: str | None = None,
    filter: str | None = None,
    tag: str | None = None,
):
    """Lista wpisów z kursorem.

    `filter` przyjmuje `following` albo `explore`. Wartość nieznana jest
    odrzucana, a nie po cichu traktowana jak brak filtra — cichy fallback
    sprawiłby, że literówka w interfejsie dawałaby inne wyniki bez śladu.

    `tag` zawęża wynik do wpisów z jednym tagiem. Jest osobno od `filter`,
    bo to dwa różne zawężenia i da się je łączyć: „odkrywaj” w jednym temacie
    to poprawne pytanie.
    """
    if filter not in (None, "following", "explore"):
        raise HttpError(
            400,
            {"code": "bad_request", "message": "Nieznany filtr feedu.", "field": "filter"},
        )

    viewer_id = _viewer_id(request)
    wanted = max(1, min(limit, MAX_LIMIT))

    query = _post_queryset()

    if filter == "following":
        if viewer_id is None:
            # Bez sesji nie ma kogo obserwować. Pusta lista jest tu poprawną
            # odpowiedzią — a nie 401, bo czytanie feedu nie wymaga konta.
            return 200, {"items": [], "nextCursor": None, "authors": {}, "following": []}
        followed_ids = list(
            Follow.objects.filter(follower_id=viewer_id).values_list("followed_id", flat=True)
        )
        query = query.filter(author_id__in=followed_ids)

    if tag:
        # Tagi to lista JSON-owa, więc zawężenie idzie po zawartości listy.
        # `clean` jest ten sam co przy zapisie: małe litery, bez spacji
        # na brzegach — inaczej „Poranek” i „poranek” dałyby dwa różne feedy.
        clean = tag.strip().lower()[:32]
        if not clean:
            raise HttpError(
                400, {"code": "bad_request", "message": "Pusty tag.", "field": "tag"}
            )
        query = query.filter(tags__contains=[clean])

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
        query = query.filter(_models_q_less_than(moment, identifier))

    # Jedno więcej niż potrzeba — obecność dodatkowego wpisu mówi, czy jest
    # następna strona. Bez tego trzeba by zgadywać po długości listy.
    rows = list(query[: wanted + 1])
    has_more = len(rows) > wanted
    page = rows[:wanted]

    # Autorzy tej strony, zebrani raz. Bez tego interfejs musiałby albo
    # dociągnąć każdego osobno, albo pokazać sam identyfikator.
    # Przy podniesieniu zbieramy DWÓCH: autora oryginału i podnoszącego —
    # interfejs pokazuje „kto napisał” i „kto podniósł”.
    author_ids: set = set()
    for post in page:
        origin = post.repost_of or post
        author_ids.add(origin.author_id)
        if post.reposted_by_id:
            author_ids.add(post.reposted_by_id)
    authors = {
        str(user.id): _author(user)
        for user in User.objects.filter(id__in=author_ids)
    }

    # Kogo z tej strony czytelnik już obserwuje — jedno zapytanie, zero
    # dodatkowych żądań z interfejsu. Bez sesji lista jest pusta, jak autorzy.
    followed_on_page: list[str] = []
    if viewer_id is not None and author_ids:
        followed_on_page = [
            str(followed_id)
            for followed_id in Follow.objects.filter(
                follower_id=viewer_id, followed_id__in=author_ids
            ).values_list("followed_id", flat=True)
        ]

    return 200, {
        "items": [_serialize(post, viewer_id) for post in page],
        "nextCursor": _encode_cursor(page[-1]) if has_more and page else None,
        "authors": authors,
        "following": followed_on_page,
    }


_MEDIA_PREFIXES = (
    "data:image/jpeg;base64,",
    "data:image/jpg;base64,",
    "data:image/png;base64,",
    "data:image/webp;base64,",
)


def _clean_media(value: str | None) -> str:
    url = (value or "").strip()
    if not url:
        return ""
    if len(url) > MEDIA_MAX_LENGTH or not url.startswith(_MEDIA_PREFIXES):
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Obraz musi być zdjęciem JPEG, PNG albo WebP i zmieścić się w limicie.",
                "field": "mediaUrl",
            },
        )
    return url


@router.post("/posts", response={201: PostOut, 400: ErrorOut, 401: ErrorOut, 403: ErrorOut})
def create_post(request, payload: CreatePostIn):
    user = current_user(request)

    if not can(user.effective_roles(), "post.create"):
        raise HttpError(
            403,
            {"code": "forbidden", "message": "Twoja rola nie pozwala publikować wpisów."},
        )

    body = (payload.body or "").strip()
    media = _clean_media(payload.mediaUrl)
    description = (payload.audioDescription or "").strip()[:500]
    if not body and not media:
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

    post = Post.objects.create(
        author=user, body=body, tags=tags, media_url=media, audio_description=description
    )
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
            Post.objects.filter(id=post.id).update(like_count=F("like_count") + 1)
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
                like_count=F("like_count") - 1
            )
        post.refresh_from_db()

    return 200, {"liked": False, "counters": _counters(post)}


@router.post(
    "/users/{user_id}/follow",
    response={200: FollowOut, 400: ErrorOut, 401: ErrorOut, 404: ErrorOut},
)
def follow_user(request, user_id: str):
    """Obserwacja autora.

    Idempotentna: para (obserwujący, obserwowany) jest unikalna w modelu,
    więc powtórne żądanie nie tworzy duplikatu i nie jest błędem. Filtr
    „obserwowani” czyta dokładnie tę tabelę — bez tego endpointu filtr
    istniał, ale nie było jak go napełnić.
    """
    user = current_user(request)

    try:
        target_id = uuid.UUID(user_id)
    except ValueError:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Identyfikator użytkownika jest nieprawidłowy.",
                "field": "user_id",
            },
        )

    if target_id == user.id:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Nie możesz obserwować samego siebie.",
                "field": "user_id",
            },
        )

    target = User.objects.filter(id=target_id).first()
    if target is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego użytkownika."})

    with transaction.atomic():
        try:
            Follow.objects.create(follower=user, followed=target)
        except IntegrityError:
            pass
        else:
            record(user, "feed.follow.create", resource=str(target.id))

    return 200, {"following": True}


@router.delete(
    "/users/{user_id}/follow",
    response={200: FollowOut, 400: ErrorOut, 401: ErrorOut, 404: ErrorOut},
)
def unfollow_user(request, user_id: str):
    """Cofnięcie obserwacji. Idempotentne jak polubienie: brak obserwacji
    nie jest błędem, tylko stanem docelowym."""
    user = current_user(request)

    try:
        target_id = uuid.UUID(user_id)
    except ValueError:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Identyfikator użytkownika jest nieprawidłowy.",
                "field": "user_id",
            },
        )

    target = User.objects.filter(id=target_id).first()
    if target is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego użytkownika."})

    deleted, _ = Follow.objects.filter(follower=user, followed=target).delete()
    if deleted:
        record(user, "feed.follow.delete", resource=str(target.id))

    return 200, {"following": False}


@router.post(
    "/posts/{post_id}/repost",
    response={200: RepostOut, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def repost_post(request, post_id: str):
    """Podniesienie wpisu.

    Podniesienie jest NOWYM wpisem, który wskazuje oryginał: `reposted_by`
    mówi kto podniósł, a `created_at` podniesienia decyduje o miejscu
    w feedzie. Idempotentne — warunek unikalny (podnoszący, oryginał) stoi
    w modelu, więc drugie podniesienie nie liczy się ani nie jest błędem.

    Podniesienie podniesienia podnosi ORYGINAŁ: łańcucha podnieść się nie
    da, bo feed czyta się od treści, a nie od historii podnoszeń.
    """
    user = current_user(request)

    if not can(user.effective_roles(), "post.create"):
        raise HttpError(
            403,
            {"code": "forbidden", "message": "Twoja rola nie pozwala podnosić wpisów."},
        )

    post = Post.objects.filter(id=post_id).first()
    if post is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego wpisu."})

    origin = post.repost_of or post

    with transaction.atomic():
        try:
            # `author` oryginału, nie podnoszącego: autor treści nie zmienia
            # się przez to, że ktoś ją podniósł. Filtr „obserwowani” widzi
            # podniesienia obserwowanych autorów dzięki temu bez wyjątku.
            Post.objects.create(
                author=origin.author, reposted_by=user, repost_of=origin, body=""
            )
        except IntegrityError:
            pass
        else:
            Post.objects.filter(id=origin.id).update(repost_count=F("repost_count") + 1)
        origin.refresh_from_db()

    return 200, {"reposted": True, "counters": _counters(origin)}


@router.delete(
    "/posts/{post_id}/repost",
    response={200: RepostOut, 401: ErrorOut, 404: ErrorOut},
)
def unrepost_post(request, post_id: str):
    """Cofnięcie podniesienia usuwa wpis-podniesienie i schodzi z licznika.

    Twarde usunięcie jak przy wpisie: kontrakt nie zna kosza. Licznik
    oryginału nie schodzi pod zero — z tego samego powodu co polubienia.
    """
    user = current_user(request)
    post = Post.objects.filter(id=post_id).first()
    if post is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego wpisu."})

    origin = post.repost_of or post

    with transaction.atomic():
        deleted, _ = Post.objects.filter(reposted_by=user, repost_of=origin).delete()
        if deleted:
            Post.objects.filter(id=origin.id, repost_count__gt=0).update(
                repost_count=F("repost_count") - 1
            )
        origin.refresh_from_db()

    return 200, {"reposted": False, "counters": _counters(origin)}


@router.get("/posts/{post_id}/comments", response={200: list[CommentOut], 404: ErrorOut})
def list_comments(request, post_id: str):
    """Komentarze wpisu. Czytanie nie wymaga sesji — tak jak czytanie feedu."""
    post = Post.objects.filter(id=post_id).first()
    if post is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego wpisu."})
    return 200, _comments_for(post.id)


@router.post(
    "/posts/{post_id}/comments",
    response={201: CommentOut, 400: ErrorOut, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def create_comment(request, post_id: str, payload: CreateCommentIn):
    """Dodanie komentarza albo odpowiedzi.

    Dwa poziomy i ani jednego więcej. Odpowiedź wskazuje komentarz główny —
    jeśli `parentCommentId` prowadzi do komentarza, który sam jest odpowiedzią,
    żądanie jest odrzucane. Zagnieżdżenie głębsze niż dwa poziomy nie istnieje
    w kontrakcie, więc przyjęcie takiego żądania wprowadziłoby stan, dla
    którego nie ma reguł wyświetlania.
    """
    user = current_user(request)

    if not can(user.effective_roles(), "post.create"):
        raise HttpError(
            403,
            {"code": "forbidden", "message": "Twoja rola nie pozwala komentować."},
        )

    post = Post.objects.filter(id=post_id).first()
    if post is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego wpisu."})

    body = (payload.body or "").strip()
    if not body:
        raise HttpError(
            400, {"code": "bad_request", "message": "Komentarz nie może być pusty.", "field": "body"}
        )
    if len(body) > COMMENT_MAX_LENGTH:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": f"Komentarz może mieć najwyżej {COMMENT_MAX_LENGTH} znaków.",
                "field": "body",
            },
        )

    parent = None
    if payload.parentCommentId:
        parent = Comment.objects.filter(id=payload.parentCommentId, post=post).first()
        if parent is None:
            raise HttpError(
                404,
                {"code": "not_found", "message": "Nie znaleziono komentarza, na który odpowiadasz."},
            )
        if parent.parent_comment_id is not None:
            raise HttpError(
                400,
                {
                    "code": "bad_request",
                    "message": "Odpowiadać można na komentarz główny — głębsze zagnieżdżenie nie istnieje.",
                    "field": "parentCommentId",
                },
            )

    with transaction.atomic():
        comment = Comment.objects.create(post=post, author=user, parent_comment=parent, body=body)
        Post.objects.filter(id=post.id).update(comment_count=F("comment_count") + 1)
        record(user, "feed.comment.create", resource=str(comment.id))

    return 201, {
        "id": str(comment.id),
        "postId": str(comment.post_id),
        "authorId": str(comment.author_id),
        "parentCommentId": str(comment.parent_comment_id) if comment.parent_comment_id else None,
        "body": comment.body,
        "likeCount": comment.like_count,
        "createdAt": comment.created_at,
    }


@router.delete("/posts/{post_id}", response={204: None, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def delete_post(request, post_id: str):
    """Usunięcie wpisu przez autora albo moderatora.

    `post.delete.any` mają moderator i administrator — tak samo jak przy
    komentarzach. Autor może usunąć swój wpis zawsze, niezależnie od roli.
    Operacja jest twarda, bo kontrakt nie zna kosza: wpis usunięty ma
    zniknąć z feedu razem ze swoimi polubieniami i komentarzami, a nie leżeć
    dalej w bazie w stanie, którego nikt nie widzi.
    """
    user = current_user(request)
    post = Post.objects.filter(id=post_id).select_related("author").first()
    if post is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego wpisu."})

    is_author = post.author_id == user.id
    can_remove_any = can(user.effective_roles(), "post.delete.any")
    if not is_author and not can_remove_any:
        raise HttpError(
            403,
            {"code": "forbidden", "message": "Możesz usunąć tylko własny wpis."},
        )

    record(user, "feed.post.delete", resource=str(post.id))
    post.delete()
    return 204, None


@router.get("/continue", response={200: list[dict], 401: ErrorOut})
def continue_work(request):
    """Niedokończone prace na pulpicie.

    Ten endpoint istniał w kontrakcie interfejsu od Etapu 1, ale nie miał
    implementacji — karta „Kontynuuj” pokazywała błąd na każdym ekranie
    pulpitu, bo żądanie wracało 404. Teraz zwraca to, co naprawdę istnieje:
    własne wpisy użytkownika, od najnowszego.

    Świadomie NIE zwraca wideo, muzyki ani pull requestów — tych zasobów
    jeszcze nie ma, a wpis na liście, którego nie da się otworzyć, byłby
    obietnicą bez pokrycia.
    """
    user = current_user(request)
    rows = _post_queryset().filter(author_id=user.id)[:20]
    return 200, [
        {
            "id": str(post.id),
            "kind": "post",
            "title": post.body or "Wpis bez opisu",
            "href": "/feed",
            "updatedAt": post.created_at,
        }
        for post in rows
    ]
