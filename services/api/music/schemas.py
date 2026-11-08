"""Kształty muzyki — te same nazwy pól co packages/core/src/music.ts."""

from datetime import datetime
from ninja import Schema


class LicenceOut(Schema):
    commercialUseAllowed: bool | None
    attributionRequired: bool
    notes: str


class TrackOut(Schema):
    id: str
    ownerId: str
    title: str
    prompt: str
    model: str
    durationSeconds: float
    attachedToPostIds: list[str]
    licence: LicenceOut
    audioUrl: str | None
    createdAt: datetime


class TrackListOut(Schema):
    items: list[TrackOut]


class GenerateTrackIn(Schema):
    prompt: str
    durationSeconds: float = 30.0
    style: str = ""
    continueFromTrackId: str | None = None
    model: str = "musicgen-small"


class GenerateTrackOut(Schema):
    jobId: str
    channel: str
    model: str
    estimatedSeconds: float | None


class QuotaOut(Schema):
    limitPerDay: int
    usedToday: int
    remainingToday: int
    resetsAt: str
