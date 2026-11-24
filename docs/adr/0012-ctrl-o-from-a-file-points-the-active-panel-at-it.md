# 0012. Ctrl+O from a file points the active panel at that file

**Status:** Accepted
**Date:** 2026-11-24
**Amends:** ADR 0004, ADR 0006

## Context
In daily use, the user edits a file, presses `Ctrl+O`, and expects the commander to be "where the file is". With restored state alone (ADR 0004), the panels show wherever they were last left, which is usually somewhere else, and the user has to navigate to the file's directory by hand. ADR 0004 rejected "always start at the active editor's directory" because it would override the saved position. In practice, that override is exactly what the user wants when they come from a file.

## Decision
When the commander is shown (`Ctrl+O` or **Open Commander**) and the active editor tab shows a file on the local filesystem (`file:` scheme; for a diff, the modified side):
- the **active panel** goes to that file's directory, with the cursor on the file;
- if the active panel is already showing that directory, only the cursor moves (the listing isn't reloaded, so the selection is kept);
- the other panel is untouched.

This also applies when the commander is created: the saved state (ADR 0004) is restored first, then the active panel is overridden.

When the active tab isn't a local file (untitled buffers, settings, other webviews, remote-only schemes), the commander opens exactly as before.

## Consequences
- `Ctrl+O` → `Ctrl+O` round trips keep working: going back to the editor doesn't change the panels.
- The saved position of the active panel is lost whenever you come from a file. The other panel keeps it, so `Tab` gets you back to "where you were".
- A file opened through a symlinked path is shown in the symlink's directory, not the target's (logical paths, ADR 0008).

## Alternatives considered
- **A separate "jump to current file" command, plain toggle unchanged.** Rejected because the user wants it on every `Ctrl+O`; an extra key would be pressed every time.
- **Move the other panel instead.** Rejected because the active panel is the one the user is about to type into.
