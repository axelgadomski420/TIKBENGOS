# Post Create Component

`PostCreateComponent` composes and submits new threads inside a community.

## Files

- `post-create.component.ts`: resolves community context, loads flairs, submits new post.
- `post-create.component.html`: form for title/content/type/flair/image.
- `post-create.component.css`: unified create-form visual language.

## Key Logic

- Reads slug from route and optional `communityId` query param fallback.
- Loads flairs via `CommunityService.getFlairs`.
- Calls `PostService.create` with `DISCUSSION` or `QUESTION` type.
- Redirects to `/app/community/post/:id` on success.

## Notes

- Route is auth-guarded, but component also protects against missing user context.
- Keep frontend type options synchronized with backend `PostType` enum.
