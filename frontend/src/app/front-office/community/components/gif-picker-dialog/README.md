# GIF Picker Dialog Component

`GifPickerDialogComponent` is a reusable Material dialog for GIF lookup and selection.

## Files

- `gif-picker-dialog.component.ts`: query state, search invocation, selected GIF result return.
- `gif-picker-dialog.component.html`: search input and result grid.
- `gif-picker-dialog.component.css`: dialog-specific visual styles.

## Data Contract

- Input data (`MAT_DIALOG_DATA`): optional `initialQuery`, optional `title`.
- Dialog close output: selected `GifResult` or `null`.

## Dependencies

- `GifService.search(query, limit)`
- `MatDialogRef<GifPickerDialogComponent, GifResult | null>`

## Notes

- Default query is `funny` to provide immediate visual results.
