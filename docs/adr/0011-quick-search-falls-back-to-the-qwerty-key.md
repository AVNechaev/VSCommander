# 0011. Quick search falls back to the QWERTY character of the physical key

**Status:** Accepted
**Date:** 2026-11-12

## Context
The keyboard capture prototype (test #14) confirmed that with a Russian layout active, `KeyboardEvent.key` is Cyrillic, so quick search can't match Latin file names. The user works with both layouts, and most file names are Latin. Real MC has the same problem: you have to switch layout before searching.

## Decision
For each typed character, quick search will:
1. try the character actually typed (`e.key`);
2. if nothing matches, retry with the character the same physical key produces on **US-QWERTY** (from `e.code`: `KeyS` → `s`, `Period` → `.`, `Shift+Minus` → `_`, and so on);
3. if neither matches, reject the character (the quick search string is unchanged).

Matching remains a case-insensitive prefix match.

## Consequences
- `ыкс` finds `src` with the Russian layout active, and Cyrillic file names are still found when typed in Cyrillic.
- The fallback assumes QWERTY key positions. It's correct for ЙЦУКЕН ↔ QWERTY, but gives meaningless characters on Dvorak, AZERTY, and similar layouts. Those users only get step 1, which is still the standard behaviour.
- The fallback is per character, so one quick search string can mix typed and fallback characters. That is invisible to the user as long as the cursor lands on the expected entry.
- Implemented in the prototype (`prototype/keyboard-capture/media/main.js`, `qwertyChar`); re-tested by the user and confirmed working.

## Alternatives considered
- **Always use the physical QWERTY key.** Rejected because it makes Cyrillic file names impossible to quick-search.
- **Leave it, and have the user switch layout (as in MC).** Rejected because the prototype showed it fails the moment the layout is Russian, which is a common state for this user.
