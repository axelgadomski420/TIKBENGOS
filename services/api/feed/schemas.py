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
