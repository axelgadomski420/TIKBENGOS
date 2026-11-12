# Community Request DTOs

Inbound payloads for community domain REST actions.

## Files

| File | Main Fields | Used By |
|---|---|---|
| `CreateCommunityRequest` | `name`, `description`, `type`, `bannerUrl`, `iconUrl` | community create/update |
| `CreatePostRequest` | `title`, `content`, `imageUrl`, `type`, `flairId` | post create/update |
| `CreateCommentRequest` | `content`, `imageUrl`, `parentCommentId` | comment create/update |
| `VoteRequest` | `targetId`, `targetType`, `value` | cast/remove vote |
| `SendMessageRequest` | `content` | send text message |
| `FollowRequest` | `followeeId`, `followType` | follow/unfollow |

## Validation Expectations

Most validation is currently enforced at service level. If adding bean validation annotations here, ensure error handling in `CommunityExceptionHandler` remains clear and consistent.
