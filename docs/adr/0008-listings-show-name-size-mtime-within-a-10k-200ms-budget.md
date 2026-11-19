# 0008. Listings show name, size and mtime; 10,000 entries render in under 200 ms

**Status:** Accepted
**Date:** 2026-11-12

## Context
Browsing from `/` (ADR 0003) means the commander will meet huge directories (50k+ entries), slow or hanging mounts (dead NFS/sshfs), permission-denied directories, and symlinks. Showing size and mtime, as MC does, requires a `stat` for every entry. The user set an explicit budget.

## Decision
- **Row content:** name, size, and modification time. Directories show a marker instead of a size.
- **Performance budget:** a directory of **10,000 entries** must go from keypress to an interactive listing in **under 200 ms**. That covers read, transfer to the webview, and render, measured on a **local workspace only**. In remote windows (Remote-SSH, WSL, containers) there is no latency target. The only guarantees there are correctness and never freezing (see *Slow listings*).
- **Slow listings:** while a new listing loads, the panel **keeps showing the old listing, still interactive**, with a loading indicator. Navigating elsewhere cancels the pending load. If it eventually fails or times out, the panel stays where it was and shows the error.

Implementation consequences we will adopt to meet the budget (proposed defaults, not yet challenged):
- **Two-phase load.** Names and entry types first (`readdir` with file types), then size and mtime `stat`s in parallel batches, streamed into the existing rows.
- **Virtualized rendering.** The webview renders only the visible rows. The DOM never holds 10k rows.
- **Compact transfer.** Listings travel to the webview as compact arrays, not one object per entry, because over Remote-SSH the extension host is remote and the webview is local.

Edge cases (proposed defaults):
- **Permission denied:** the panel does not change directory and shows the error inline.
- **Symlink to a directory:** `Enter` follows it, and `..` goes back to the directory that contained the link (the logical path, as in MC), not the target's parent.
- **Broken symlink:** listed and visibly marked. `Enter`/`F3` shows an error instead of opening.

## Consequences
- Rows can briefly show names before size and mtime appear. That is an accepted visual cost for staying under budget.
- Virtualized rendering makes quick search and cursor movement operate on the data model, not the DOM.
- A hanging mount can never freeze the UI. At worst, a panel shows a spinner over its previous listing.
- The budget is a testable requirement: a 10k-entry fixture directory should be part of the test suite.

## Alternatives considered
- **Name only.** Rejected because size and mtime are part of the MC listing the user wants.
- **Hold the budget over Remote-SSH too.** Rejected because it would force first-screen-first transfer and prefetching, and the user accepts slower remote listings as long as nothing freezes. Revisit if remote becomes the main way the user works.
- **Block the panel until the listing completes.** Rejected because a dead mount would freeze that panel.
- **Render every row in the DOM.** Rejected because 10k DOM rows won't fit in a 200 ms budget.
