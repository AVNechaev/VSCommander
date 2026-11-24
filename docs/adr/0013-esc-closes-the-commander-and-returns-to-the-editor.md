# 0013. Esc closes the commander and returns to the editor

**Status:** Accepted
**Date:** 2026-11-24
**Amends:** ADR 0006

## Context
`Ctrl+O` (ADR 0006) hides the commander behind the editor, and the commander's tab stays in the tab bar. The user wants a quick way to dismiss the commander entirely after jumping in from a file, landing back in that file, the way you dismiss a dialog.

## Decision
`Esc` in the commander:
1. if a quick search is in progress, clears it (unchanged);
2. otherwise saves the panel state (ADR 0004), focuses the editor `Ctrl+O` came from (the same target as the return half of the toggle), and **closes the commander tab**.

`Esc` is always consumed by the commander and never reaches VS Code.

## Consequences
- After `Esc`, the next `Ctrl+O` creates the commander again from saved state. Scroll position, selection and an in-progress quick search are lost (they are only kept while the tab is hidden, ADR 0005), and the listings are re-read.
- `Ctrl+O` stays the "keep it around" way back; `Esc` is the "done with it" way back.
- If the editor it came from was closed meanwhile, focus goes to the previously used editor in the group, as for `Ctrl+O`.

## Alternatives considered
- **Esc only hides the commander, like Ctrl+O.** Rejected because the user asked for it to close, and it would duplicate `Ctrl+O`.
