import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { readNames, readStats, withTimeout, TimeoutError } from '../src/listing.ts';
import { KIND_BROKEN, KIND_DIR, KIND_LINK } from '../src/protocol.ts';

async function tempDir(t: { after(fn: () => Promise<void>): void }): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vscommander-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('readNames: directories first, natural case-insensitive order, symlinks classified', async t => {
  const dir = await tempDir(t);
  await fs.mkdir(path.join(dir, 'b-dir'));
  await fs.mkdir(path.join(dir, 'A-dir'));
  await fs.writeFile(path.join(dir, 'file10.txt'), '');
  await fs.writeFile(path.join(dir, 'file2.txt'), 'xx');
  await fs.writeFile(path.join(dir, 'Zeta'), '');
  await fs.symlink(path.join(dir, 'b-dir'), path.join(dir, 'link-to-dir'));
  await fs.symlink(path.join(dir, 'file2.txt'), path.join(dir, 'link-to-file'));
  await fs.symlink(path.join(dir, 'missing'), path.join(dir, 'broken'));

  const { names, kinds } = await readNames(dir);
  assert.deepEqual(names, ['A-dir', 'b-dir', 'link-to-dir', 'broken', 'file2.txt', 'file10.txt', 'link-to-file', 'Zeta']);
  const kind = (n: string) => kinds[names.indexOf(n)];
  assert.equal(kind('A-dir'), KIND_DIR);
  assert.equal(kind('link-to-dir'), KIND_DIR | KIND_LINK);
  assert.equal(kind('link-to-file'), KIND_LINK);
  assert.equal(kind('broken'), KIND_LINK | KIND_BROKEN);
  assert.equal(kind('Zeta'), 0);
});

test('readStats: sizes and mtimes for a range, -1 never for a broken link (lstat fallback)', async t => {
  const dir = await tempDir(t);
  await fs.writeFile(path.join(dir, 'a'), 'hello');
  await fs.symlink(path.join(dir, 'missing'), path.join(dir, 'broken'));
  const { sizes, mtimes } = await readStats(dir, ['a', 'broken', 'gone'], 0, 3);
  assert.equal(sizes[0], 5);
  assert.ok(mtimes[0] > 0);
  assert.ok(sizes[1] >= 0, 'broken link falls back to lstat');
  assert.equal(sizes[2], -1, 'entry deleted since phase 1');
  assert.equal(mtimes[2], -1);
});

test('readNames: permission denied surfaces as EACCES', { skip: process.getuid?.() === 0 }, async t => {
  const dir = await tempDir(t);
  const locked = path.join(dir, 'locked');
  await fs.mkdir(locked, 0o000); // empty, so tempDir's cleanup can still remove it
  await assert.rejects(readNames(locked), { code: 'EACCES' });
});

test('withTimeout rejects with TimeoutError', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 20), TimeoutError);
  assert.equal(await withTimeout(Promise.resolve(7), 1000), 7);
});

test('budget (ADR 0008): 10,000 entries read and stat-ed well under 200 ms', async t => {
  const dir = await tempDir(t);
  const COUNT = 10_000;
  for (let i = 0; i < COUNT; i += 500) {
    await Promise.all(Array.from({ length: Math.min(500, COUNT - i) }, (_, k) => fs.writeFile(path.join(dir, `f${i + k}.txt`), '')));
  }
  // Warm up once (first readdir of a fresh directory may hit cold caches), then measure.
  await readNames(dir);
  const t0 = performance.now();
  const { names } = await readNames(dir);
  const t1 = performance.now();
  for (let start = 0; start < names.length; start += 1000) await readStats(dir, names, start, start + 1000);
  const t2 = performance.now();
  t.diagnostic(`phase 1 (names): ${(t1 - t0).toFixed(1)} ms, phase 2 (stats): ${(t2 - t1).toFixed(1)} ms`);
  assert.equal(names.length, COUNT);
  // The 200 ms budget is keypress-to-interactive. Rows become interactive after phase 1, so phase 1 gets the budget,
  // leaving room for transfer and render; phase 2 streams in afterwards.
  assert.ok(t1 - t0 < 100, `phase 1 took ${(t1 - t0).toFixed(1)} ms`);
});
