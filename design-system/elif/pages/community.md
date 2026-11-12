# Community Page Overrides

Project: Elif  
Updated: 2026-03-29  
Page Type: Community Discovery + Conversation Workspace

This file overrides design-system/elif/MASTER.md for community pages.

---

## Page-Specific Rules

### Layout Overrides

- Max Width: use wide content container (existing max-w-6xl or max-w-7xl behavior).
- Layout: multi-region workspace, not single-column marketing.
  - Hero/header block
  - Left rail: quick actions and filters
  - Main column: trending feed and browse results
  - Right rail: contextual metrics and top communities
- Keep sticky rails on desktop and collapse to one column on smaller screens.

### Information Architecture

- Entry order:
  1.  Community hero and key actions
  2.  Trending conversations
  3.  Discovery and filtering
  4.  Community grid
  5.  Context rails (current feed, top communities, notes)
- Membership-aware surfaces should change actions based on login and role.

### Color Overrides

- Keep Elif brand-teal and brand-orange as the dominant action accents.
- Avoid introducing non-Elif primary palettes.
- Reserve brand-red for errors/destructive actions.

### Motion and Interaction Overrides

- Keep staggered reveal animations subtle and optional.
- For detail and workspace pages, animate by block in this order: hero, rails, toolbar/controls, feed/list items.
- Use short reveal durations (about 220ms-380ms) and small offset distances to avoid theatrical movement.
- Prefer micro-motion on interactive rows/cards (hover lift, border emphasis) only when it does not change layout.
- Do not use cheap rise/bounce motion patterns as the default visual language for community pages.
- Preferred motion language: calm fade-in, subtle scale settle, and emphasis through border/shadow/color rather than vertical movement.
- Keep timing cadence consistent across community surfaces:
  - hero settle around 260ms
  - section/block reveal around 220ms
  - list/item reveal around 180ms
  - stagger step roughly 30ms-45ms
- Under prefers-reduced-motion:
  - disable fade-in-up / fade-in effects
  - force animated elements to visible state
  - remove non-essential transform-based hover transitions
- Important actions must never rely on hover only.

### Accessibility Overrides

- Focus-visible treatment is required for:
  - hero actions
  - filter controls
  - left/right rail links
  - community cards
- Search controls must stay keyboard-friendly and announce result count updates.

### Post and Comment Surface Overrides

- Post detail and post cards should prioritize intuitive byline context:
  - `u/author`
  - creation time
  - optional edited / latest activity state
- Avoid technical/system-first metadata in visible primary surfaces (for example raw post IDs).
- Keep comment UI thread-first and action-clear:
  - reply, vote, accepted-answer state
  - concise, readable metadata chips
  - no clutter blocks that do not help discussion flow.
- Do not duplicate engagement metrics in the same post surface:
  - when a vote rail is visible, avoid repeating score as a separate dominant chip.
  - prefer comments/views as supporting stats in feed cards.
- Fallback author labels must be user-safe and non-technical:
  - use `u/Member` or equivalent neutral label.
  - do not render numeric user identifiers in bylines.

### Community Detail Workspace Overrides

- Avoid duplicating the same metrics between hero and rails; each region should provide distinct value.
- Keep management surfaces concise: short explanatory copy and section-level actions over decorative status chips.
- Hero action hierarchy should remain clear:
  - primary for create/join progression,
  - secondary for neutral tools,
  - destructive styling for leave/remove flows.
- Apply the same motion vocabulary across all community surfaces (discovery, detail, create, post detail, inbox, chat) to keep transitions coherent.
- Inbox and chat should keep conversational rhythm:
  - inbox items use subtle staggered reveal to support scan order,
  - message bubbles can use short horizontal enter cues,
  - avoid exaggerated movement in conversation UIs.
- On mobile widths, disable non-essential entry animation for dense lists and message streams (feed cards, comment stacks, inbox rows, chat bubbles).

---

## Page-Specific Components

- Community hero actions (create, login, inbox).
- Joined-community grouped accordion in left rail.
- Trending sort control chips.
- Discovery filter chips and searchable list.
- Community cards with role and visibility pills.

---

## Recommendations

- Keep the page as a product workspace, not a pure marketing landing.
- Prioritize readability and task completion over decorative effects.
- Maintain consistent card and chip language with the rest of Front Office.
