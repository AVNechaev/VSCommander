# 0001. Panels show one directory as a flat list, never a tree

**Status:** Accepted
**Date:** 2026-11-12

## Context
The extension exists for three reasons: Midnight Commander muscle memory, browsing outside the workspace, and the fact that VS Code's Explorer tree is hard to navigate by keyboard. In the tree, expanding a folder shifts everything below it, entries from different depths are interleaved, and the cursor's position depends on a tree shape that keeps changing.

## Decision
We will render each panel as a flat listing of exactly one directory. `Enter` on a directory replaces the listing with that directory's contents. Going up (the `..` entry or its key) replaces the listing with the parent's contents and puts the cursor on the directory just left. Panels never expand a directory in place.

## Consequences
- Navigation state is simple: one current directory plus one cursor position per panel.
- "Return to where I was" works because the cursor lands on the child you came out of.
- You can't see two depths of the hierarchy in one panel. The second panel is the only way to see another place at the same time.
- Any later request for a tree view inside a panel contradicts this ADR and needs a new decision.

## Alternatives considered
- **Reuse or extend the Explorer tree (TreeView API).** Rejected because the tree model itself is the navigation problem being solved, not a missing feature of it.
- **Tree with expand-in-place inside a panel.** Rejected for the same reason: it brings back the shifting layout and interleaved depths.
