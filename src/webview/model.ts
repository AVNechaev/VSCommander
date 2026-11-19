// Pure webview logic: entries, quick search, formatting. No DOM: unit-testable.
import { KIND_DIR, KIND_UP } from '../protocol.ts';

export interface Entry {
  name: string;
  kind: number;
  /** undefined while phase 2 stats are pending; -1 if stat failed. */
  size?: number;
  mtime?: number;
}

export function buildEntries(names: readonly string[], kinds: readonly number[], hasParent: boolean): Entry[] {
  const entries: Entry[] = hasParent ? [{ name: '..', kind: KIND_DIR | KIND_UP }] : [];
  for (let i = 0; i < names.length; i++) entries.push({ name: names[i], kind: kinds[i] });
  return entries;
}

/** Index of the first entry (never `..`) whose name starts with `prefix`, case-insensitively; -1 if none. */
export function findPrefix(entries: readonly Entry[], prefix: string): number {
  const lower = prefix.toLowerCase();
  return entries.findIndex(e => !(e.kind & KIND_UP) && e.name.toLowerCase().startsWith(lower));
}

/**
 * Extend the quick search string by one keypress (ADR 0011): try the typed character, then the QWERTY character of the
 * same physical key. Returns the new string and the matching index, or undefined if the keypress is rejected.
 */
export function extendQuickSearch(
  entries: readonly Entry[],
  current: string,
  typed: string,
  fallback: string | undefined,
): { text: string; index: number } | undefined {
  for (const ch of fallback && fallback !== typed ? [typed, fallback] : [typed]) {
    const index = findPrefix(entries, current + ch);
    if (index >= 0) return { text: current + ch, index };
  }
  return undefined;
}

/** MC-style size column: exact bytes up to 7 digits, then K/M/G/T. */
export function formatSize(e: Entry): string {
  if (e.kind & KIND_UP) return 'UP--DIR';
  if (e.kind & KIND_DIR) return '<DIR>';
  if (e.size === undefined || e.size < 0) return '';
  let n = e.size;
  let unit = 0;
  while (n >= 10_000_000 && unit < 4) {
    n = Math.round(n / 1024);
    unit++;
  }
  return unit ? `${n}${' KMGT'[unit]}` : String(n);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SIX_MONTHS_MS = 182 * 24 * 3600 * 1000;

/** MC/ls-style mtime: `Nov 12 09:32` within six months, `Nov 12  2024` otherwise. */
export function formatTime(ms: number | undefined, now: number): string {
  if (ms === undefined || ms < 0) return '';
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, ' ');
  const head = `${MONTHS[d.getMonth()]} ${day}`;
  if (Math.abs(now - ms) < SIX_MONTHS_MS) {
    return `${head} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${head} ${String(d.getFullYear()).padStart(5, ' ')}`;
}
