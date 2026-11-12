# Community Repositories

This folder contains Spring Data JPA repositories for community aggregates.

## Repository Responsibilities

| File | Responsibility |
|---|---|
| `CommunityRepository` | slug lookups and public-community ranking |
| `CommunityMemberRepository` | membership existence/lookup/listing |
| `CommunityRuleRepository` | ordered rules per community |
| `FlairRepository` | flair listing and scoped flair lookup |
| `PostRepository` | post retrieval with deleted/type/flair filters and text search |
| `CommentRepository` | tree source queries, counts, accepted-answer lookup |
| `VoteRepository` | unique vote lookup and target cleanup |
| `FollowRepository` | follow existence/list/delete by type |
| `ConversationRepository` | participant-pair lookup and inbox ordering |
| `MessageRepository` | conversation messages, unread counts, unread selection |
| `MessageAttachmentRepository` | attachment entity access |

## Query Conventions

- Soft-delete reads generally include `DeletedAtIsNull` in method names.
- Chat inbox and message ordering are encoded in repository method naming.
- Vote and follow uniqueness is enforced in schema plus service-level idempotent checks.

## Notes

- For large datasets, convert list-returning methods to pageable variants before adding heavy analytics features.
