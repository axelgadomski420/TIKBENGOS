# Detail Settings Dialog Placeholder

This folder is currently a placeholder for a future dedicated settings-dialog component.

## Current State

- The settings experience is rendered from a template inside `community-detail.component.html`.
- Dialog lifecycle is controlled by `CommunityDetailComponent` using `MatDialog`.

## Why This Exists

Keeping this folder reserves a clean migration path if settings are extracted into standalone dialog components later.

## Suggested Future Split

- `detail-settings-dialog.component.ts`: local form state and section routing.
- `detail-settings-dialog.component.html`: modal shell and section panes.
- `detail-settings-dialog.component.css`: isolated modal styles.
