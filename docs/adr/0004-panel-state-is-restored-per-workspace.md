# 0004. Panel state is restored per workspace, falling back to root + home

**Status:** Accepted, amended by ADR 0012 (coming from a file moves the active panel to it)
**Date:** 2026-11-12

## Context
Panels need a starting directory every time the commander opens. The user wants to pick up where they left off, and their two main needs are navigating the project and browsing outside it (ADR 0003).

## Decision
We will save, per workspace (in VS Code `workspaceState`), each panel's current directory, the name of the entry under its cursor, and which panel is active. When the commander opens, we restore that state.
- **First time in a workspace, or no saved state:** the left panel starts at the first workspace root, the right panel at the home directory of the workspace host.
- **No workspace open:** both panels start at home (ADR 0003).
- **Saved directory no longer exists:** walk up to the nearest existing ancestor. If the cursor entry is gone, the cursor goes to the top of the listing.
- **Selection is not saved.**

## Consequences
- Reopening the commander is "continue", not "start over".
- State lives with the workspace, so two projects keep independent positions.
- No-workspace windows share one global position (stored in `globalState`).
- Stale paths are expected (branches switched, directories deleted) and handled by walking up, never by an error.

## Alternatives considered
- **Always start both panels at the workspace root.** Rejected because it throws away the user's position and doesn't serve the "outside the workspace" need.
- **Always start at the active editor's directory.** Rejected as the default because it overrides the user's last position. It could return later as a separate "jump to current file" command.
- **On a missing directory, fall back to root + home.** Rejected in favour of the nearest existing ancestor, which keeps the user close to where they were.
