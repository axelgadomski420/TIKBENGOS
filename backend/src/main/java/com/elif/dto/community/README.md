# Community DTOs

This folder groups transport contracts exchanged between controller endpoints and clients.

## Subfolders

- `request/`: inbound REST payloads.
- `response/`: outbound REST payloads.
- `realtime/`: STOMP payloads/events.
- `search/`: reserved for search-specific DTOs (currently empty).

## Contract Principles

- Keep DTOs transport-focused; do not leak entity internals.
- Use response DTO mapping in services (especially for messaging) to avoid recursive entity serialization.
- Keep frontend interfaces in `frontend/src/app/front-office/community/models` aligned with these contracts.
