// Layout fallback for quick search (ADR 0011).

/** US-QWERTY characters for punctuation keys, by KeyboardEvent.code: [unshifted, shifted]. */
const PUNCT: Record<string, [string, string]> = {
  Minus: ['-', '_'],
  Equal: ['=', '+'],
  Period: ['.', '>'],
  Comma: [',', '<'],
  Slash: ['/', '?'],
  Semicolon: [';', ':'],
  Quote: ["'", '"'],
  BracketLeft: ['[', '{'],
  BracketRight: [']', '}'],
  Backquote: ['`', '~'],
};

/** The character the physical key `code` would produce on a US-QWERTY layout, or undefined. */
export function qwertyChar(code: string, shift: boolean): string | undefined {
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return shift ? m[1] : m[1].toLowerCase();
  m = /^Digit(\d)$/.exec(code);
  if (m) return shift ? undefined : m[1];
  const p = PUNCT[code];
  return p ? p[shift ? 1 : 0] : undefined;
}
