# Community Enums

This folder defines stable enum contracts used across entities, DTOs, services, and controllers.

## Enum Roles

| Enum | Values | Used In |
|---|---|---|
| `CommunityType` | `PUBLIC`, `PRIVATE` | community visibility and join behavior |
| `MemberRole` | `MEMBER`, `MODERATOR`, `CREATOR` | membership authorization hierarchy |
| `PostType` | `DISCUSSION`, `QUESTION` | post semantics, accepted-answer eligibility |
| `SortMode` | `HOT`, `NEW`, `TOP`, `CONTROVERSIAL` | feed/trending sorting logic |
| `TargetType` | `POST`, `COMMENT` | vote target polymorphism |
| `FollowType` | `USER`, `COMMUNITY` | follow target polymorphism |

## Compatibility Notes

- Frontend literal unions should match these enum names exactly.
- Adding values requires updating both backend switch logic (for sorting/voting/etc.) and frontend UI controls.
