# 0002. v1 never modifies the filesystem; copy/move between panels comes next

**Status:** Accepted
**Date:** 2026-11-12

## Context
Midnight Commander is mostly a file *manager*: F5 copy, F6 move, F7 mkdir, F8 delete. Most of its complexity, and all of its risk, lives in those operations (overwrite conflicts, copying a directory into itself, half-finished cross-device moves, progress for large trees, undo). The user's muscle memory covers arrows, `Enter`, `Tab`, typing quick search, and `Insert` selection, and none of the F-keys. In v1, selection exists only so that several files can be opened at once.

The user values copy/move between panels as a defining MC feature, but no concrete workflow needs it today.

## Decision
- **v1 is strictly read-only.** It lists directories, reads metadata, and asks VS Code to open files in editor tabs. It never creates, renames, moves, copies, or deletes anything.
- **Copy and move between panels are the planned next step after v1.** Source = selection (or cursor entry if nothing is selected) in the active panel; destination = the other panel's current directory.
- **Delete, make-directory, and create-file are out of scope.** VS Code's Explorer and the terminal already cover them.

## Consequences
- v1 needs no confirmation dialogs, conflict resolution, progress reporting, or undo. A bug can't destroy data.
- The v1 model (two panels, an active panel, a selection) is already exactly what copy/move need, so adding them later requires no rework of navigation.
- When copy/move land, this ADR is superseded by one that settles conflict policy, cross-filesystem moves, and progress and cancellation.
- If delete/mkdir are ever requested, that is a new scope decision, not a follow-on to this one.

## Alternatives considered
- **Copy/move in v1.** Rejected because no concrete workflow requires it yet, F5/F6 aren't in the user's muscle memory, and it brings in nearly all the risk.
- **Read-only forever.** Rejected because the user considers copy/move between panels a core part of what makes MC worth emulating.
- **Full MC file-operation set (F5–F8, new file).** Rejected because delete, mkdir, and new file are already easy in Explorer and the terminal, and delete is the highest-risk operation of all.
