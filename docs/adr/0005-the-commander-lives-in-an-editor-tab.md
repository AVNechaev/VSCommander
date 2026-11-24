# 0005. The commander lives in an editor tab (webview panel)

**Status:** Accepted, amended by ADR 0014 (one panel by default, two as a setting)
**Date:** 2026-11-12

## Context
Two side-by-side panels need horizontal space: names, sizes, and dates in each half. VS Code offers four places to put custom UI: an editor tab, the bottom Panel area, the sidebar, or a transient Quick Pick overlay. The goal is to feel like MC (ADR 0001, glossary: *Panel*).

## Decision
We will implement the commander as a single webview panel shown as an editor tab. It renders both panels and captures keystrokes while it has focus.

## Consequences
- Full editor width and height, so two panes fit comfortably, as in MC.
- Because the commander is an editor tab, opening a file in the same editor group puts the commander behind the new tab. Where opened files go is decided separately (see the next ADR).
- Webview keyboard handling only applies while the webview has focus. Global VS Code keybindings (`Ctrl+P`, `F1`, and so on) still take precedence unless rebound.
- Webview content is torn down when the tab is hidden unless `retainContextWhenHidden` is set. The implementation sets it: every file open hides the commander (ADR 0006), and `Ctrl+O` must bring it back instantly with scroll, selection, and quick search intact. Saved state (ADR 0004) covers window reloads.
- The UI is HTML/CSS, so it must follow VS Code theme colours (CSS variables) to look native.

## Alternatives considered
- **Bottom Panel area.** Rejected because it is only about 10–15 rows tall, which is too few entries per listing.
- **Sidebar view.** Rejected because it is too narrow for two panes side by side.
- **Quick Pick / overlay.** Rejected because it can't show two persistent panels, which is the defining shape of the tool.
- **Native TreeView.** Rejected by ADR 0001 (tree model), and it can't render two panes in one view anyway.
