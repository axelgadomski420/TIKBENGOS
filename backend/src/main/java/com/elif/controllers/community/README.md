# Community Controllers

This folder exposes REST and STOMP endpoints for the community domain.

## File Responsibilities

| File                                    | Responsibility                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `CommunityController.java`              | community CRUD, membership, moderator actions, rules, flairs                 |
| `PostController.java`                   | post list/detail/trending/search plus create/update/delete/pin               |
| `CommentController.java`                | comment tree fetch, create/update/delete, accepted answer                    |
| `MessagingController.java`              | inbox, conversation management, message send/read/delete, attachment content |
| `CommunityRealtimeController.java`      | STOMP handlers for presence connect and typing events                        |
| `CommunityPresenceSessionListener.java` | emits offline presence event on WebSocket session disconnect                 |
| `VoteController.java`                   | cast or remove votes for post/comment targets                                |
| `FollowController.java`                 | follow/unfollow/list for user or community targets                           |
| `GiphyController.java`                  | GIF search proxy endpoint                                                    |
| `CommunityExceptionHandler.java`        | module-wide HTTP exception mapping for community controllers                 |

## Endpoint Contracts

- Base REST path: `/api/community` (except GIF path rooted at `/api/community/gifs`).
- Messaging REST path: `/api/community/messages`.
- STOMP mappings: `/app/community/presence.connect`, `/app/community/typing`.
- STOMP topics: `/topic/community.presence`, `/topic/community.conversation.{id}.typing`, `/topic/community.conversation.{id}.messages`.

## Auth and Authorization Notes

- Controllers rely on `X-User-Id` headers for identity on write operations.
- Admin impersonation uses optional `X-Act-As-User-Id` (community/post creation flows).
- Authorization decisions are delegated to service layer methods (`requireModerator`, ownership checks, participant checks).

## HTTP Error Policy

`CommunityExceptionHandler` maps domain exceptions to stable responses:

- 404: `CommunityNotFoundException`, `PostNotFoundException`
- 403: `NotMemberException`, `UnauthorizedModeratorException`, `ForbiddenActionException`
- 400: `IllegalStateException`, `IllegalArgumentException`

## Flow Diagram

```mermaid
graph TD
  UI[Frontend] --> CC[CommunityController]
  UI --> PC[PostController]
  UI --> CoC[CommentController]
  UI --> MC[MessagingController]
  UI --> VC[VoteController]

  WSClient["STOMP Client"] --> RC["CommunityRealtimeController"]
  RC --> PresenceTopic["/topic/community.presence"]
  RC --> TypingTopic["/topic/community.conversation.:id.typing"]
  MC --> MsgTopic["/topic/community.conversation.:id.messages"]

  CC --> Services["services/community/*"]
  PC --> Services
  CoC --> Services
  MC --> Services
```
