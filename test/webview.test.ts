import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qwertyChar } from '../src/webview/keys.ts';
import { buildEntries, extendQuickSearch, findPrefix, formatSize, formatTime } from '../src/webview/model.ts';
import { KIND_DIR, KIND_UP } from '../src/protocol.ts';

const entries = buildEntries(['src', 'docs', 'README.md', 'отчёт.txt', '.gitignore'], [KIND_DIR, KIND_DIR, 0, 0, 0], true);

test('buildEntries prepends .. unless at the root', () => {
  assert.equal(entries[0].name, '..');
  assert.equal(entries[0].kind, KIND_DIR | KIND_UP);
  assert.equal(buildEntries(['a'], [0], false).length, 1);
});

test('findPrefix is case-insensitive and never matches ..', () => {
  assert.equal(findPrefix(entries, 'read'), 3);
  assert.equal(findPrefix(entries, '.'), 5, 'skips ".." and finds .gitignore');
  assert.equal(findPrefix(entries, 'xyz'), -1);
});

test('qwertyChar maps physical keys to US-QWERTY characters (ADR 0011)', () => {
  assert.equal(qwertyChar('KeyS', false), 's');
  assert.equal(qwertyChar('KeyS', true), 'S');
  assert.equal(qwertyChar('Digit3', false), '3');
  assert.equal(qwertyChar('Period', false), '.');
  assert.equal(qwertyChar('Minus', true), '_');
  assert.equal(qwertyChar('F3', false), undefined);
});

test('quick search: Russian layout falls back to the QWERTY key, Cyrillic names still match (ADR 0011)', () => {
  // Typing "ыкс" on ЙЦУКЕН = physical keys S, R, C.
  let qs = '';
  for (const [typed, code] of [['ы', 'KeyS'], ['к', 'KeyR'], ['с', 'KeyC']] as const) {
    const r = extendQuickSearch(entries, qs, typed, qwertyChar(code, false));
    assert.ok(r, `"${typed}" accepted`);
    qs = r.text;
  }
  assert.equal(qs, 'src');
  assert.equal(extendQuickSearch(entries, '', 'о', qwertyChar('KeyJ', false))?.index, 4, 'Cyrillic name typed in Cyrillic');
  assert.equal(extendQuickSearch(entries, 'src', 'q', 'q'), undefined, 'non-matching char rejected');
});

test('formatSize: markers for directories, bytes, then units', () => {
  assert.equal(formatSize(entries[0]), 'UP--DIR');
  assert.equal(formatSize({ name: 'd', kind: KIND_DIR }), '<DIR>');
  assert.equal(formatSize({ name: 'f', kind: 0 }), '', 'pending stats');
  assert.equal(formatSize({ name: 'f', kind: 0, size: 9_999_999 }), '9999999');
  assert.equal(formatSize({ name: 'f', kind: 0, size: 50 * 1024 * 1024 }), '51200K');
  assert.equal(formatSize({ name: 'f', kind: 0, size: 20 * 1024 ** 3 }), '20480M');
});

test('formatTime: time within six months, year otherwise', () => {
  const now = new Date(2026, 10, 19, 12, 0).getTime();
  assert.equal(formatTime(new Date(2026, 10, 2, 9, 5).getTime(), now), 'Nov  2 09:05');
  assert.equal(formatTime(new Date(2024, 0, 15).getTime(), now), 'Jan 15  2024');
  assert.equal(formatTime(-1, now), '');
});
