# 0010. "Native look" means theme colours, VS Code fonts, and Codicons, not the user's file icon theme

**Status:** Accepted
**Date:** 2026-11-12

## Context
ADR 0009 makes the native look the primary acceptance criterion. ADR 0005 puts the commander in a webview editor tab. Webviews get theme colours (`--vscode-*` CSS variables) and fonts (`--vscode-font-family`, `--vscode-editor-font-family`), but VS Code exposes no API for a webview to use the active *file icon theme*. Only native views such as TreeViews get those icons.

## Decision
We will keep the webview editor tab (ADR 0005) and define "native look" as:
- **Colours:** only VS Code theme CSS variables (list and selection colours, focus border, foreground, and so on), so the commander follows light, dark, and high-contrast themes automatically. No hard-coded colours, and no MC blue palette.
- **Fonts:** the workbench UI font, as Explorer uses, with tabular numerals and right-aligned size and mtime columns. *(Proposed default; the alternative is the editor's monospace font.)*
- **Icons:** Codicons (`@vscode/codicons`), VS Code's own glyph set, for folder, file, symlink, broken link, and up (`..`). The user's file icon theme (Seti, Material, and so on) is **not** reproduced.

## Consequences
- The commander follows theme changes live with no extra code.
- File icons are generic (folder vs. file vs. link), not per-language. That is a visible difference from Explorer, accepted by the user.
- High-contrast themes must be checked explicitly, since webviews don't get focus outlines automatically.
- Moving to the user's icon theme later means either option (b) below or a move to native views. Both are large changes, so this is moderately hard to reverse.

## Alternatives considered
- **Webview plus manually loading the user's icon theme** (read `workbench.iconTheme`, locate the contributing extension, parse its JSON, serve its fonts or SVGs). Rejected because it is large and fragile, depends on undocumented formats, and has theme-specific edge cases.
- **Two native TreeViews used as flat lists.** Rejected even though they give real theme icons, because it would supersede ADR 0005: no full-width editor tab, no aligned columns, and the views would sit in the narrow sidebar or the short bottom panel.
- **No icons.** Rejected because Explorer has icons, so a commander without them looks less native.
