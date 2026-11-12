# Post Card Component

`PostCardComponent` is the reusable post preview used in list and detail feeds.

## Files

- `post-card.component.ts`: card input/output contract and action emitters.
- `post-card.component.html`: compact metadata + vote + navigation layout.
- `post-card.component.css`: card styles and hover behavior.

## Contract

- Input: `post`.
- Output: `voted` event for parent-level refresh hooks.

## Notes

- Keep card presentation read-focused; heavy actions remain in page-level components.
