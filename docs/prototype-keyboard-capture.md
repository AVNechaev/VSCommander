# Prototype: keyboard capture in a webview editor tab

Throwaway code, formerly in `prototype/keyboard-capture/`; deleted after the results below were folded into the ADRs and the real extension. This document is kept as the record. It tests the riskiest technical assumption behind ADRs 0005–0007: **a webview editor tab can receive MC-style keys, and `Ctrl+O` can toggle between it and the editor.** Delete the prototype once the results below are filled in and folded into ADRs.

## Run it

```sh
code --extensionDevelopmentPath="$PWD/prototype/keyboard-capture" --disable-extensions .
```

Or open `prototype/keyboard-capture/` in VS Code and press `F5`. Then, in the new window:

1. Open any file from the workspace in the Explorer, so the toggle has an editor to return to.
2. Press `Ctrl+O`, or run **VSCommander Prototype: Open**.
3. Keep **VSCommander Prototype: Show Key Log** (Output panel) visible. It logs every key the webview saw, whether it handled it, and every open and toggle.

The commander tab shows two panels (left = workspace root, right = home), a focus badge (green = webview has keyboard focus), a **preventDefault** checkbox, and an in-page key log.

## What the prototype does

| Key | Action |
|---|---|
| ↑ ↓ PgUp PgDn Home End | move cursor |
| `Enter` | dir: go into it (`..` lands the cursor on the dir you left); file: open as **permanent** tab; with a selection: open all selected |
| `Tab` | switch active panel |
| `Insert`, `Ctrl+T` | toggle selection of the file under the cursor, move down |
| `F3` | open as **preview** tab |
| letters/digits | quick search (case-insensitive prefix; a non-matching char is rejected) |
| `Backspace` / `Esc` | edit / clear quick search |
| `Ctrl+O` | not handled by the webview; the extension's keybinding toggles commander ⇄ last editor |

## Test checklist

Fill in **Result** with ✅ / ❌ and a note. ❓ marks the outcomes I'm least sure of. Those are the reason this prototype exists.

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | Open the commander with `Ctrl+O` from an editor. Without clicking, press ↓ | Badge green, cursor moves. ❓ Focus may not land inside the webview iframe until clicked | |
| 2 | `Tab` | Active panel switches; focus does **not** leave the webview | |
| 3 | `Tab` ten times quickly | Always toggles, never escapes to the tab bar or sidebar | |
| 4 | `Insert` on a file (if your keyboard has it) | File marked, cursor moves down | |
| 5 | `Ctrl+T` on a file | File marked. ❓ VS Code's "Go to Symbol in Workspace" may **also** open | |
| 6 | Repeat #5 with **preventDefault unchecked** | Compare with #5: does preventDefault stop the workbench from getting the key? | |
| 7 | `F3` on a file | Preview (italic) tab opens and takes focus | |
| 8 | `Ctrl+O`, `F3` on another file | Second preview **replaces** the first | |
| 9 | `Ctrl+O`, `Enter` on the file currently in preview | Tab becomes permanent (non-italic); no duplicate tab | |
| 10 | `Insert` 3 files, `Enter` | 3 permanent tabs; focus on the last; selection cleared | |
| 11 | In an editor, `Ctrl+O` | Commander revealed **and focused** (same as #1) | |
| 12 | In the commander, `Ctrl+O` | Returns to the last editor, with focus in the text | |
| 13 | Type a few letters of a file name | Cursor jumps; nothing else in VS Code reacts | |
| 14 | Switch keyboard layout to **Russian**, type letters | ❓ `e.key` will be Cyrillic, so quick search finds no Latin names. Does it need a layout-independent fallback (`e.code`)? | |
| 15 | Russian layout, `Ctrl+O` | Toggle still works (VS Code binds by key code) | |
| 16 | `Esc` with no quick search active | Nothing happens; VS Code doesn't close or blur anything | |
| 17 | `F1`, `Ctrl+P` in the commander | Command Palette and Quick Open open (expected: global keys win) | |
| 18 | Integrated terminal focused, `Ctrl+O` | Goes to the shell, not the toggle (expected per ADR 0006) | |
| 19 | `Enter` on `..` repeatedly up to `/` | Cursor lands on the dir just left each time; no `..` at root | |
| 20 | `Enter` on `/root` (or another unreadable dir) | Error logged; panel stays where it was | |

## Results

Run 2026-11-12 by the user on Linux, VS Code 1.145.3. Reported overall: "everything works", with these specifics:

| # | Result |
|---|---|
| 1, 11 | ✅ Focus lands inside the webview after `Ctrl+O`; arrows work with no click. |
| 14 | ❌ As predicted: with a Russian layout, typed characters are Cyrillic and don't match Latin file names. Fixed by ADR 0011 (QWERTY fallback). ✅ Re-tested: works. |
| 5, 6 | ✅ "Go to Symbol in Workspace" never opened when `Ctrl+T` was pressed in the commander. The keys the commander handles are not double-dispatched to the workbench; whether that depends on the `preventDefault` checkbox wasn't distinguished. |
| Others | ✅ Reported working, not confirmed row by row. |

## Decisions this feeds

- If **#1/#11 fail** (focus doesn't land in the webview): ADR 0005/0006 need a workaround, or the placement question reopens.
- If **#5/#6 show double handling**: the extension must contribute `when: activeWebviewPanelId == 'vscommanderProto'` keybindings that shadow conflicting workbench keys, rather than relying on `preventDefault`.
- If **#14 fails**: quick search needs a layout-independent mode. That's a new glossary refinement for *Quick search*.
- If **#3 fails**: `Tab` can't be the panel switch, which breaks core muscle memory and has to go back to the user.
