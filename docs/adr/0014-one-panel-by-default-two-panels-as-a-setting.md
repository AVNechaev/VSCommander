# 0014. One panel by default; two panels as a setting

**Status:** Accepted
**Date:** 2026-11-24
**Amends:** ADR 0005

## Context
The commander was built around two side-by-side panels (ADRs 0001, 0005). In v1 the commander is read-only (ADR 0002), so the second panel has no copy/move destination role yet. The user mostly uses it to jump to a file's directory and open files (ADR 0012), where one full-width panel shows longer names and is less noise.

## Decision
A setting `vscommander.layout` with values:
- `single` (**default**): only the active panel is shown, at full width. `Tab` does nothing.
- `dual`: two panels side by side, as before. `Tab` switches between them.

Both panels always exist and keep their directories and cursors (ADR 0004); `single` only hides the other one. Changing the setting applies immediately to an open commander.

## Consequences
- With `single`, the hidden panel keeps whatever directory it had, and shows it again when you switch to `dual`.
- Copy/move (ADR 0002) will need a destination. In `single` that will have to come from elsewhere (a prompt, or the hidden panel's directory); to be decided with copy/move.
- Which panel is shown in `single` is whichever was active when the state was saved.

## Alternatives considered
- **Keep two panels as the default.** Rejected because the user asked for one panel by default.
- **`Tab` swaps which panel is shown in `single`.** Rejected for now because it switches directory with nothing on screen saying there is a second panel.
