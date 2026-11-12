# Community Realtime DTOs

Payload contracts for STOMP realtime messaging.

## Files

| File | Direction | Fields |
|---|---|---|
| `PresenceConnectRequest` | client -> server | `userId` |
| `TypingRequest` | client -> server | `conversationId`, `typing` |
| `PresenceEvent` | server -> clients | `userId`, `userName`, `online`, `occurredAt` |
| `TypingEvent` | server -> clients | `conversationId`, `senderId`, `senderName`, `typing`, `occurredAt` |

## Topic Contract

- Presence events: `/topic/community.presence`
- Typing events: `/topic/community.conversation.{id}.typing`

## Notes

- Server validates session participation before emitting typing events.
- Presence events are emitted on first connect and final disconnect (multi-tab aware).
