# 0007. Enter opens a permanent tab; F3 opens a preview tab

**Status:** Accepted
**Date:** 2026-11-12

## Context
VS Code opens files as preview tabs by default, and the next preview replaces the previous one. In the commander loop (open A, `Ctrl+O`, open B, per ADR 0006), default preview behaviour would silently close A. MC distinguishes *view* (`F3`) from *open/edit*, and the user does reach for `F3` to view.

## Decision
- **`Enter` on a file** opens it as a **permanent** tab (`preview: false`), whatever `workbench.editor.enablePreview` is set to.
- **`F3` on a file** opens it as a **preview** tab (`preview: true`), replacing any previous preview tab in that group.
- **`F3` ignores the selection** and opens only the cursor entry, because there is a single preview slot.
- **`Enter` on a file that is already open** focuses its existing tab and makes it permanent if it was a preview. No duplicate tab is created.
- Both keys move focus to the file (ADR 0006).

## Consequences
- Files opened with `Enter` never vanish unexpectedly. Tabs accumulate, and closing them is the user's job.
- Quick looks with `F3` don't clutter the tab bar.
- `F3` is the only F-key bound in v1. Inside the commander webview it conflicts with nothing; VS Code's F3 "find next" only applies in text editors.
- The behaviour deliberately ignores the user's global preview setting, so people who rely on that setting may be surprised.

## Alternatives considered
- **Always permanent.** Rejected because it leaves no tidy way to glance at a file.
- **Always preview (Explorer single-click semantics).** Rejected because files vanish in the open → `Ctrl+O` → open loop.
- **Follow `workbench.editor.enablePreview`.** Rejected because the default (on) produces the vanishing-tab problem, and the commander's two-key model is more explicit.
- **`Shift+Enter` or `Space` for preview.** Rejected because `F3` is the MC "view" key and the user actually uses it.
