"""Kształty wpisu feedu — te same nazwy pól co `packages/core/src/feed.ts`.

Pole `counters` jest zagnieżdżonym obiektem, bo tak stoi w kontrakcie.
Interfejs czyta `post.counters.likes`, a nie `post.likeCount` — zmiana tutaj
bez zmiany w kontrakcie jest błędem, a nie refaktoryzacją.
"""

from datetime import datetime

from ninja import Schema


class CountersOut(Schema):
    likes: int
    comments: int
    reposts: int
    bookmarks: int
    views: int


class PostOut(Schema):
    id: str
    authorId: str
    body: str | None
    # `media`, `audioDescription` i `trackId` są w kontrakcie, ale nie mają
    # jeszcze skąd przyjść: upload i transkodowanie to Etap 2. Zwracamy
    # `None` — to jest prawda o stanie, a nie brak implementacji do ukrycia.
    media: None = None
    tags: list[str]
    audioDescription: None = None
    trackId: None = None
    counters: CountersOut
    repostedBy: str | None
    createdAt: datetime


class CreatePostIn(Schema):
    body: str
    tags: list[str] | None = None


class LikeOut(Schema):
    liked: bool
    counters: CountersOut


class AuthorOut(Schema):
    """Autor wpisu — to, co wolno pokazać publicznie.

    Świadomie BEZ adresu email. Feed jest czytany także bez sesji, więc
    wszystko, co tu trafi, jest publiczne z definicji. `displayName` może
    być puste, więc interfejs ma fallback na uchwyt — ale decyzja, co
    pokazać, należy do interfejsu, a nie do tego schematu.
    """

    id: str
    username: str
    displayName: str | None
    avatarUrl: str | None


class PostListOut(Schema):
    """Strona feedu razem z autorami.

    Autorzy jadą obok wpisów, a nie w każdym wpisie, bo ten sam autor
    powtarza się w kilku pozycjach — nadmiar tego samego obiektu w każdej
    z nich to transfer bez treści.

    Mapa, a nie lista: interfejs dopasowuje autora po identyfikatorze,
    więc kolejność nie niesie informacji.
    """

    items: list[PostOut]
    nextCursor: str | None
    authors: dict[str, AuthorOut]


class CommentOut(Schema):
    id: str
    postId: str
    authorId: str
    parentCommentId: str | None
    body: str
    likeCount: int
    createdAt: datetime


class CreateCommentIn(Schema):
    body: str
    parentCommentId: str | None = None
