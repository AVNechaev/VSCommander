# VSCommander

A two-panel, keyboard-driven file navigator for VS Code in the spirit of Midnight Commander. Each panel shows one directory as a flat list. Navigate anywhere on the workspace's machine and open files in VS Code tabs. Read-only in v1.

Design decisions live in [`docs/adr/`](docs/adr/), and terms in [`docs/glossary.md`](docs/glossary.md).

## Keys

| Key | Action |
|---|---|
| `Ctrl+O` | Toggle between the commander and the last editor (opens the commander if needed). Coming from a file, the active panel jumps to that file's directory, cursor on the file |
| `↑` `↓` `PgUp` `PgDn` `Home` `End` | Move the cursor |
| `Enter` | Directory: go into it (`..` goes up, landing on the directory you left). File: open as a permanent tab. With a selection: open all selected files |
| `F3` | Open the cursor file as a preview tab |
| `Tab` | Switch panel (two-panel layout only) |
| `Insert` / `Ctrl+T` | Select or deselect the cursor file, then move down |
| typing | Quick search: case-insensitive prefix. Russian layout falls back to the QWERTY key, so `ыкс` finds `src` |
| `Backspace` | Edit the quick search |
| `Esc` | Clear the quick search; if there is none, close the commander and return to the editor you came from |
| `Ctrl+R` | Reload the panel |
| mouse | Click selects a row; double-click acts like `Enter` |

`Ctrl+O` isn't available while the integrated terminal has focus; the shell gets it.

## Settings

| Setting | Default | |
|---|---|---|
| `vscommander.layout` | `single` | `single`: one full-width panel. `dual`: two panels side by side, `Tab` switches |

## Install locally

VSCommander isn't on the Marketplace. Build a `.vsix` package and install it from the file:

```sh
npm install
npm run package                                   # builds dist/ for production and writes vscommander-0.1.0.vsix
code --install-extension vscommander-0.1.0.vsix   # or: Extensions view → "…" → Install from VSIX…
```

Reload any open VS Code windows, then press `Ctrl+O`, or run **VSCommander: Open Commander** from the Command Palette.

- **Updating:** bump `version` in `package.json` if you like, run `npm run package` again, and reinstall the new `.vsix`. Installing the same version again overwrites it.
- **Uninstalling:** `code --uninstall-extension local.vscommander`, or use the Extensions view.
- **Remote windows (SSH, WSL, Dev Containers):** VSCommander runs on the machine where the workspace lives (ADR 0003), so it has to be installed *there*. In a remote window, use Extensions view → "…" → **Install from VSIX…** (it installs into the remote), or click **Install in SSH: …** next to the locally installed extension.
- **Keybinding conflicts:** `Ctrl+O` replaces VS Code's *File: Open File…*. To use a different key, rebind **VSCommander: Toggle Commander / Editor** in Keyboard Shortcuts (`Ctrl+K Ctrl+S`).

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
