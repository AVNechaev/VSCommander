# 0003. Panels browse the machine the workspace is on

**Status:** Accepted
**Date:** 2026-11-12

## Context
VS Code often runs split: the UI on the user's machine, and the workspace on a remote host (Remote-SSH, WSL, Dev Containers). One of the reasons for this extension is browsing *outside* the workspace, so "which filesystem" has to be decided explicitly. With copy/move planned next (ADR 0002), letting panels sit on different machines would turn F5 into an upload or download.

## Decision
We will have both panels browse the filesystem of the machine where the workspace lives. Locally that is the local disk; in a remote window it is the remote host's whole filesystem from `/`. The extension will run in the workspace extension host (`extensionKind: ["workspace"]`) and do all filesystem access there. In a window with no workspace, both panels start in the home directory of that machine.

## Consequences
- Files opened from a panel are normal tabs of that window: editable, with language servers and git, because they live on the same machine as the workspace.
- Copy/move, when it comes, is always a same-machine operation.
- You can't browse the *local* disk from a remote window. That is a deliberate loss.
- The home directory is the workspace host's home (`os.homedir()` in the extension host), not the laptop's.
- Reversing this later (per-panel machines) would affect every filesystem call and the copy/move design, so it is expensive.

## Alternatives considered
- **Local filesystem only (Node `fs` in a UI-side extension).** Rejected because in remote windows it browses the wrong machine, and files opened from it are second-class there.
- **Per-panel choice of machine (left remote, right local).** Rejected because it adds a machine dimension to every path and makes future copy/move a cross-machine transfer, and no workflow calls for it.
