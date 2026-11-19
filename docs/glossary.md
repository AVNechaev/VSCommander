# Glossary

### Active panel
The one panel of the two that currently receives keystrokes. `Tab` makes the other panel active. Not the same as VS Code editor focus: the active panel only matters while the commander itself has focus.

### Commander
The whole extension UI: one VS Code editor tab (a webview) containing the two panels (ADR 0005). "Open the commander" means show or focus that tab.

### Current directory
The single directory whose contents a panel is listing right now. Each panel has its own.

### Cursor
The highlighted entry in a panel's listing, which keyboard actions operate on. Not the same as the editor text cursor, and not the same as panel focus (see *Active panel*).

### Listing
The flat, non-recursive list of entries in a panel's current directory, plus a leading `..` entry for going up. A listing never contains entries from more than one directory level.

### Native look
The commander uses only VS Code theme colours, VS Code fonts, and Codicons, so it reads as part of VS Code rather than as a terminal app (ADR 0010). It does **not** include the user's file icon theme. It is v1's primary acceptance criterion (ADR 0009).

### Open
Ask VS Code to show a file in an editor tab. The only action v1 takes on a file; v1 never modifies the filesystem (ADR 0002).

### Open permanently (Enter)
Open a file as a normal tab that stays until the user closes it (ADR 0007).

### Open as preview (F3)
Open the cursor file in VS Code's single preview slot (italic tab), which the next preview replaces (ADR 0007). The commander's equivalent of MC's *view*. Unlike MC's F3, it shows the file in a normal VS Code editor, not a built-in viewer.

### Other panel
The panel that is not the active panel. Its current directory will be the destination for copy/move once they exist (ADR 0002).

### Panel
One half of the commander UI: it shows the listing of exactly one current directory and has its own cursor. Not to be confused with VS Code's "Panel" area (the bottom region holding Terminal, Problems, and so on), or with the *Active panel* / *Other panel* roles each panel takes in turn.

### Quick search
Typing printable characters while a panel has focus moves the cursor to a matching entry in the listing. Unlike real MC, where plain typing goes to the shell command line and quick search needs `Ctrl+S`. Here plain typing *is* quick search, as in Far Manager and Total Commander. Case-insensitive prefix match. If a typed character matches nothing, the QWERTY character of the same physical key is tried (ADR 0011), so `ыкс` finds `src`.

### Selection
The set of files marked with `Insert` in one panel. In v1 it is used only to open several files at once; later it will be the source for copy/move. Different from the cursor: the cursor is a single entry, while the selection can be empty or contain many entries.

### Toggle (Ctrl+O)
Flip focus between the commander tab and the editor that was active before it (ADR 0006). Like MC's `Ctrl+O`, but here it switches tabs rather than revealing a shell.
