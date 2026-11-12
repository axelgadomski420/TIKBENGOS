#!/usr/bin/env python3
"""Remove unsupported hover: variants from Tailwind @apply declarations.

Tailwind v3 does not resolve variant-prefixed classes inside @apply. Keep the
base utilities in @apply and express these hover states as regular CSS rules.
Run from the repository root before rebuilding the web image.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CSS_ROOT = ROOT / "src"

# Preserve equivalent hover styling for the affected global components.
GLOBAL_HOVERS = r"""
/* Hover states use CSS instead of variant-prefixed Tailwind @apply. */
.btn-primary:hover { background-color: color-mix(in srgb, var(--purre-violet, #3a9282) 90%, transparent); box-shadow: 0 4px 12px rgb(0 0 0 / 18%); }
.btn-secondary:hover { background-color: color-mix(in srgb, var(--purre-amber, #f89a3f) 5%, transparent); box-shadow: 0 4px 12px rgb(0 0 0 / 12%); }
.btn-danger:hover { background-color: color-mix(in srgb, var(--purre-red, #d64956) 90%, transparent); box-shadow: 0 4px 12px rgb(0 0 0 / 18%); }
.card-brand:hover { box-shadow: 0 8px 20px rgb(0 0 0 / 12%); }
"""
SERVICE_HOVERS = r"""
/* Hover states are plain CSS: Tailwind variants cannot be used in @apply. */
.radio-card:hover { border-color: color-mix(in srgb, var(--purre-violet, #3a9282) 50%, transparent); }
.image-drop-zone:hover {
  background-color: color-mix(in srgb, var(--purre-violet, #3a9282) 5%, #f9fafb);
  border-color: var(--purre-violet, #3a9282);
}
"""

changed = []
for path in CSS_ROOT.rglob("*.css"):
    original = path.read_text(encoding="utf-8")
    updated_lines = []
    changed_file = False
    for line in original.splitlines(keepends=True):
        if "@apply" in line and "hover:" in line:
            replaced = re.sub(r"\bhover:[^\s;]+", "", line)
            # Clean up whitespace left behind without changing declarations.
            replaced = re.sub(r"[ \t]{2,}", " ", replaced)
            if replaced != line:
                line = replaced
                changed_file = True
        updated_lines.append(line)

    updated = "".join(updated_lines)
    if path == CSS_ROOT / "styles.css" and "/* Hover states use CSS instead of variant-prefixed Tailwind @apply. */" not in updated:
        updated += "\n" + GLOBAL_HOVERS
        changed_file = True
    if path == CSS_ROOT / "app/back-office/service-management/service-form/service-form.component.css" and "/* Hover states are plain CSS: Tailwind variants cannot be used in @apply. */" not in updated:
        updated += "\n" + SERVICE_HOVERS
        changed_file = True
    if changed_file:
        path.write_text(updated, encoding="utf-8")
        changed.append(path.relative_to(ROOT).as_posix())

if changed:
    print("Updated Tailwind @apply hover variants in:")
    print("\n".join(f" - {path}" for path in changed))
else:
    print("No unsupported hover variants found; files already patched.")
