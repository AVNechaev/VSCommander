# VSCommander

A two-panel, keyboard-driven file navigator for VS Code in the spirit of Midnight Commander. Each panel shows one directory as a flat list. Navigate anywhere on the workspace's machine and open files in VS Code tabs. Read-only in v1.

Design decisions live in [`docs/adr/`](docs/adr/), and terms in [`docs/glossary.md`](docs/glossary.md).

## Keys

| Key | Action |
|---|---|
| `Ctrl+O` | Toggle between the commander and the last editor (opens the commander if needed) |
| `↑` `↓` `PgUp` `PgDn` `Home` `End` | Move the cursor |
| `Enter` | Directory: go into it (`..` goes up, landing on the directory you left). File: open as a permanent tab. With a selection: open all selected files |
| `F3` | Open the cursor file as a preview tab |
| `Tab` | Switch panel |
| `Insert` / `Ctrl+T` | Select or deselect the cursor file, then move down |
| typing | Quick search: case-insensitive prefix. Russian layout falls back to the QWERTY key, so `ыкс` finds `src` |
| `Backspace` / `Esc` | Edit / clear the quick search |
| `Ctrl+R` | Reload the panel |
| mouse | Click selects a row; double-click acts like `Enter` |

`Ctrl+O` isn't available while the integrated terminal has focus; the shell gets it.

## Development

```sh
npm install
npm run check      # typecheck + unit tests + build
npm run watch      # rebuild on change
```

Press `F5` in VS Code to launch an Extension Development Host. Then press `Ctrl+O`, or run **VSCommander: Open Commander**.

- `src/extension.ts`, `src/commander.ts`: extension host (webview tab, toggle, state, file opening)
- `src/listing.ts`, `src/paths.ts`: filesystem reading and path rules (no `vscode` imports; unit-tested)
- `src/webview/`: the UI (`main.ts`), with pure logic in `model.ts` and `keys.ts` (unit-tested)
- `test/`: `node --test`, run directly on the TypeScript sources (Node ≥ 23.6)
