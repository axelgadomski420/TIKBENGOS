# Detail Left Rail Subcomponent

`DetailLeftRailComponent` renders left-column community context and member grouping sections.

## Files

- `detail-left-rail.component.ts`: receives required `host` reference.
- `detail-left-rail.component.html`: member lists, role labels, quick stats.
- `detail-left-rail.component.css`: rail-specific styling.

## Notes

- Reads computed host properties (`orderedMembers`, filtered lists) rather than duplicating sorting logic.
- Keep this component stateless and host-driven.
