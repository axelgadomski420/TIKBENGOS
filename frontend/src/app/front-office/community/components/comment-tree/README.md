# Comment Tree Component

`CommentTreeComponent` is the recursive renderer and interaction layer for nested comments.

## Files

- `comment-tree.component.ts`: vote/edit/delete/reply logic, recursion helpers, GIF integration.
- `comment-tree.component.html`: recursive template with per-node controls.
- `comment-tree.component.css`: depth-aware visual hierarchy.

## Inputs and Outputs

- Inputs: `comment`, `postId`, `postOwnerId`, `postType`, `depth`, `userId`, `canModerateCommunity`, `acceptedAnswerSelected`.
- Outputs: `accept` (accepted answer intent), `imagePreview` (open image modal in parent).

## Security-Critical UX

- Edit allowed only for comment author.
- Delete allowed for author or moderator.
- Accepted answer action exposed only for QUESTION posts and post owner.

## Notes

- Uses optimistic voting with rollback.
- Deleted comments are rendered as `[deleted]` placeholder nodes to preserve thread structure.
