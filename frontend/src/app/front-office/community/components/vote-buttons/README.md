# Vote Buttons Component

`VoteButtonsComponent` is the shared vote UI used by both posts and comments.

## Files

- `vote-buttons.component.ts`: control state and vote event output.
- `vote-buttons.component.html`: compact upvote/downvote control.
- `vote-buttons.component.css`: state styling for active upvote/downvote.

## Contract

- Inputs: `score`, `userVote`.
- Output: `voted` with `1` or `-1`.

## Notes

- The component is intentionally transport-agnostic; network calls happen in parent components.
