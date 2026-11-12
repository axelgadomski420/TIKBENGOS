# Community Exceptions

Domain-specific runtime exceptions used by community services and mapped by `CommunityExceptionHandler`.

## Files

| File | Typical Meaning |
|---|---|
| `CommunityNotFoundException` | missing community id/slug |
| `PostNotFoundException` | missing post id |
| `NotMemberException` | user is not a member where membership is required |
| `UnauthorizedModeratorException` | moderator/creator/admin privilege required |
| `ForbiddenActionException` | ownership-based action denied (author-only rules) |

## HTTP Mapping

These exceptions are translated to stable HTTP responses in controller advice:

- 404 for not-found exceptions
- 403 for membership/moderation/forbidden exceptions

## Notes

Keep exception messages user-readable; they are returned directly in API error payloads.
