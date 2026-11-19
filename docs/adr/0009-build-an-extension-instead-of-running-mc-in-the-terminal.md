# 0009. Build an extension instead of running mc in the integrated terminal

**Status:** Accepted
**Date:** 2026-11-12

## Context
Real Midnight Commander can already run inside VS Code: `EDITOR=code mc` in the integrated terminal, optionally as a full-width terminal tab in the editor area. That provides full MC muscle memory, including copy/move, works over Remote-SSH and WSL, and costs nothing to build. So a custom extension needs a reason beyond "stay inside VS Code", which both options satisfy.

The user's reasons are both:
1. **Native integration**, above all a commander that **looks like VS Code** (theme colours, fonts, file icons) rather than a terminal application.
2. **Wanting to build a VS Code extension**, as a learning and ownership project.

## Decision
We will build a VS Code extension. Its **primary acceptance criterion** is the native look: if it doesn't look and feel like part of VS Code, it has not beaten `mc` in a terminal and v1 is not done. Because the second reason is partly learning, scope discipline wins over completeness: a small, native-looking v1 is preferred to a broad one.

## Consequences
- Every UI choice must be checked against "does this look like VS Code?". That means theme CSS variables, VS Code fonts, and VS Code-style icons, not MC's blue-and-cyan palette.
- MC's *behaviour* (keys, flat panels) is emulated; MC's *appearance* is deliberately not.
- `mc` in a terminal stays the fallback, and the benchmark: any feature where the extension is clearly worse than mc in a terminal is a regression.
- Going back to "just use mc" means abandoning the code, but no user data or workflow is locked in, so the cost is the build time only.

## Alternatives considered
- **`mc` in the integrated terminal (with `EDITOR=code`).** Rejected because it looks like a terminal application (terminal colours and font, no VS Code file icons), and `Enter`/`Ctrl+O` belong to mc rather than VS Code. Still the benchmark.
- **Extend or reconfigure the Explorer.** Rejected by ADR 0001 (tree model).
