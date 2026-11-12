# Design System Master File

> LOGIC: When building a specific page, first check design-system/elif/pages/[page-name].md.
> If that file exists, its rules override this Master file.
> If not, follow this Master file.

---

Project: Elif  
Updated: 2026-03-29  
Category: Petcare Platform (Front Office + Back Office)

---

## Global Rules

### Product Tone

- Front Office: warm, welcoming, pet-friendly, community-driven.
- Back Office: clean, dense, operational, moderation-first.
- Shared: high legibility, predictable interaction states, keyboard-accessible controls.

### Color Palette (Elif-Aligned)

| Role            | Hex               | Tailwind Token   |
| --------------- | ----------------- | ---------------- |
| Primary         | #3A9282           | brand-teal       |
| Secondary       | #F89A3F           | brand-orange     |
| Attention       | #FBD18B           | brand-yellow     |
| Soft Accent     | #FEE8CD           | brand-peach      |
| Error/Critical  | #D64956           | brand-red        |
| Base Background | #FFFFFF / #F8FAFC | white / slate-50 |
| Primary Text    | #0F172A           | slate-900        |
| Secondary Text  | #475569           | slate-600        |

Color Notes:

- Primary actions use brand-teal.
- Highlight actions and warm accents use brand-orange.
- Use brand-red for destructive or critical states only.
- Preserve existing front-office and back-office visual language.

### Typography

- Heading Font: project default sans stack.
- Body Font: project default sans stack.
- Mood: modern, clear hierarchy, readable at data-dense and content-rich scales.

### Spacing and Radius

- Preferred spacing scale: 2, 3, 4, 6, 8, 10, 12, 16.
- Card radius: rounded-xl.
- Major surfaces: rounded-2xl only when needed.
- Avoid introducing one-off spacing tokens.

### Elevation

- Default card: subtle elevation.
- Interactive card: slightly stronger hover elevation without layout shift.
- Overlays and modals: clear separation from page surface.

---

## Component Specs

### Buttons

- Primary: filled brand-teal with white text.
- Secondary: neutral/outlined style with clear hover and focus-visible ring.
- Destructive: brand-red with explicit confirmation flow for high-risk actions.
- Required states: hover, active, disabled, focus-visible.

### Cards and Panels

- Use neutral light surfaces with subtle border and shadow.
- Hover effects may adjust border/shadow/color but must not shift layout.
- Clickable card areas must expose cursor and keyboard focus.
- Prefer user-centered metadata (author, time, status) over internal/system identifiers.
- Avoid duplicate metrics in the same card surface (for example score in both vote rail and stats row).
- Fallback identity labels in user-facing UI must stay human-readable (for example `Member`) and must not expose numeric IDs.

### Inputs

- Minimum 44px target height where practical.
- Visible labels and helper/error text.
- Focus-visible ring required; avoid outline removal without replacement.

### Motion

- Keep transitions in 150ms-300ms range.
- Decorative motion can be used in hero/non-critical surfaces only.
- Respect prefers-reduced-motion by disabling non-essential animations.
- Prefer micro-level motion by component block (hero, rails, cards, list rows) with subtle staggered reveal and no layout shift.
- Motion must reinforce hierarchy and scanning order, not decorate every element equally.
- Destructive actions may use distinct color emphasis, but motion should remain calmer than primary success actions.
- Avoid cheap rise/bounce patterns (for example repeated upward translateY lifts) on page load or hover; prefer calm fade/settle, contrast, and shadow emphasis.
- Recommended cadence for workspace pages:
  - hero settle: about 260ms
  - block reveal: about 220ms
  - item/list reveal: about 180ms
- On mobile dense surfaces (threads, inbox lists, chat histories), prefer minimal or no entry animation to prioritize clarity and responsiveness.

---

## Layout Patterns

- Front Office module pages: content-first layouts with discoverability side rails when helpful.
- Back Office module pages: operational panels and compact controls with stronger information density.
- Keep module-level shell consistency:
  - Front Office shell with navbar/footer continuity.
  - Back Office shell with sidebar/header/task workspace continuity.

---

## Anti-Patterns

- Emoji icons in UI controls.
- Hover-only critical affordances on touch flows.
- Low-contrast text in light mode.
- Focus removal without focus-visible replacement.
- Over-animated interfaces that hide content hierarchy.
- Brand drift away from Elif teal/orange system.
- Exposing technical identifiers in primary UI surfaces (for example raw IDs) when not required for user tasks.
- Repeating the same engagement signal multiple times in one surface (for example duplicate score chips).

---

## Pre-Delivery Checklist

- [ ] Icons come from a consistent set.
- [ ] All interactive controls expose pointer and focus-visible states.
- [ ] Motion is reduced under prefers-reduced-motion.
- [ ] Light-mode contrast satisfies WCAG guidance.
- [ ] Responsive behavior verified at 375, 768, 1024, and 1440 widths.
- [ ] No horizontal overflow on mobile.
- [ ] Front Office and Back Office visual personalities remain distinct.
- [ ] Community pages keep Elif palette, not alternate brand palettes.
