"""Uprawnienia — odbicie `ROLE_PERMISSIONS` z `packages/core/src/identity.ts`.

Ta sama tabela po obu stronach. Serwer nie ufa interfejsowi w kwestii
uprawnień; interfejs nie chce pokazywać wejść, które i tak zostaną odrzucone.
"""

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "user": {"post.create", "music.generate", "settings.manage"},
    "creator": {"post.create", "music.generate", "settings.manage", "repo.connect"},
    "moderator": {
        "post.create",
        "post.delete.any",
        "comment.moderate",
        "user.suspend",
        "settings.manage",
    },
    "developer": {
        "post.create",
        "music.generate",
        "code.contribute",
        "repo.connect",
        "settings.manage",
    },
    "admin": {
        "post.create",
        "post.delete.any",
        "comment.moderate",
        "user.suspend",
        "music.generate",
        "code.contribute",
        "repo.connect",
        "settings.manage",
    },
}


def permissions_for(roles: list[str]) -> list[str]:
    granted: set[str] = set()
    for role in roles:
        granted |= ROLE_PERMISSIONS.get(role, set())
    return sorted(granted)


def can(roles: list[str], permission: str) -> bool:
    return permission in permissions_for(roles)
