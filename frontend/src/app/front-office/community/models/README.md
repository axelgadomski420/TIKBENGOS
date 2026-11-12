# Community Models

This folder defines strongly typed frontend contracts for community domain responses.

## File Contracts

- `community.model.ts`: `Community`, `Flair`, `CommunityRule`, `CommunityMember`.
- `post.model.ts`: `Post` including optional viewer fields like `userVote`.
- `comment.model.ts`: recursive `Comment` structure with replies.
- `message.model.ts`: `Conversation`, `Message`, `MessageAttachment`.
- `realtime.model.ts`: `PresenceEvent`, `TypingEvent` for STOMP payloads.

## Alignment Rules

- Keep names and optionality aligned with backend DTOs under `backend/src/main/java/com/elif/dto/community/response`.
- Favor extending these interfaces over introducing ad hoc local component types.
- Any auth-driven nullable fields (`userRole`, `userVote`) should stay optional and explicitly handled in templates.
