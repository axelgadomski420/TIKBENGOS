# Community Response DTOs

Outbound payloads returned to frontend clients.

## Files

| File | Purpose |
|---|---|
| `CommunityResponse` | community details plus optional `userRole` context |
| `CommunityMemberResponse` | member identity + role + joined timestamp |
| `PostResponse` | thread payload with vote/comment/view metadata |
| `CommentResponse` | threaded comment payload with nested replies |
| `ConversationResponse` | inbox row contract with counterpart and unread count |
| `MessageResponse` | conversation message payload with attachments |
| `MessageAttachmentResponse` | attachment metadata and access URL |
| `GifResponse` | GIF search result contract |

## Mapping Notes

- `PostResponse.userVote` and `CommentResponse.userVote` are viewer-dependent and may be `null`.
- `ConversationResponse` is generated from canonical participant IDs and enriched with display names.
- `MessageResponse.attachments` are resolved to attachment access URLs when binary data exists.
