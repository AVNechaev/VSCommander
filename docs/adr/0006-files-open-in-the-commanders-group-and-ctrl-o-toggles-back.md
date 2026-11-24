# 0006. Files open in the commander's editor group; Ctrl+O toggles between commander and editor

**Status:** Accepted, amended by ADR 0012 (coming from a file moves the active panel to it) and ADR 0013 (Esc closes the commander)
**Date:** 2026-11-12

## Context
The commander is an editor tab (ADR 0005). Opening a file has to put it somewhere and move focus somewhere. Splitting into a side group would halve the commander's width, which brings back the "too narrow" problem that ruled out the sidebar. MC's own model is a full-screen commander you leave and come back to with `Ctrl+O`.

## Decision
- `Enter` on a file opens it in the **same editor group** as the commander, and **focus moves to the file**. The commander tab stays open behind it.
- `Enter` with a non-empty selection opens every selected file as its own tab in that group. Focus lands on the last one, and the selection is cleared.
- The extension contributes **`Ctrl+O` as a toggle**:
  - from any editor, it reveals and focuses the commander tab, opening it if it's closed;
  - from the commander, it returns to the editor that was active before the commander.
- `Ctrl+O` replaces VS Code's default `File: Open File…` on Linux and Windows. That loss is intended: the commander is the way to open files.

## Consequences
- The commander keeps full width at all times.
- You can't see the commander and a file at the same time. Use `Ctrl+O` to flip between them, as in MC.
- `Ctrl+O` won't reach the extension while the integrated terminal has focus, because the shell gets it, unless the command is added to `terminal.integrated.commandsToSkipShell`.
- On macOS, the equivalent default is `Cmd+O`. Which modifier the extension binds there is still open.
- The extension needs to remember the previously active editor for the return half of the toggle.

## Alternatives considered
- **Open in a side group, focus to file.** Rejected because it halves the commander's width.
- **Open in a side group, focus stays in the commander.** Rejected for the same width reason, and it diverges from MC's leave-and-return flow.
- **Same group, file opens in the background.** Rejected because you would open a file and then still have to switch to it.
- **A different hotkey that conflicts with nothing.** Rejected because `Ctrl+O` is the MC muscle memory, and the conflict (Open File) is a feature the commander replaces.
