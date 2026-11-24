import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeError, hasParent, isCommanderState, nearestExistingDir, resolveInitialState, resolveNavigation, revealInState } from '../src/paths.ts';
import { TimeoutError } from '../src/listing.ts';
import type { CommanderState } from '../src/protocol.ts';

test('resolveNavigation: up lands the cursor on the directory just left (ADR 0001)', () => {
  assert.deepEqual(resolveNavigation('/a/b/c', '..'), { target: '/a/b', focus: 'c' });
  assert.deepEqual(resolveNavigation('/a/b', 'c'), { target: '/a/b/c', focus: undefined });
  assert.deepEqual(resolveNavigation('/a/b', '', 'x'), { target: '/a/b', focus: 'x' });
});

test('resolveNavigation: paths are logical through symlinks (ADR 0008)', () => {
  // /home/u/link -> /srv/data; going up from /home/u/link returns to /home/u, not /srv.
  assert.deepEqual(resolveNavigation('/home/u/link', '..'), { target: '/home/u', focus: 'link' });
});

test('hasParent is false only at the root', () => {
  assert.equal(hasParent('/'), false);
  assert.equal(hasParent('/a'), true);
});

const existing = (set: string[]) => async (p: string) => set.includes(p);

test('nearestExistingDir walks up to the nearest existing ancestor (ADR 0004)', async () => {
  assert.equal(await nearestExistingDir('/a/b/c', existing(['/a/b/c', '/a'])), '/a/b/c');
  assert.equal(await nearestExistingDir('/a/b/c', existing(['/a'])), '/a');
  assert.equal(await nearestExistingDir('/a/b/c', existing([])), undefined);
});

test('resolveInitialState: saved state restored; cursor kept only if the directory survived (ADR 0004)', async () => {
  const defaults: CommanderState = { active: 0, panels: [{ dir: '/ws' }, { dir: '/home/u' }] };
  const saved: CommanderState = { active: 1, panels: [{ dir: '/ws/src', cursorName: 'x.ts' }, { dir: '/tmp/gone/deep', cursorName: 'y' }] };
  const state = await resolveInitialState(saved, defaults, existing(['/ws/src', '/tmp']));
  assert.deepEqual(state, { active: 1, panels: [{ dir: '/ws/src', cursorName: 'x.ts' }, { dir: '/tmp' }] });
  assert.deepEqual(await resolveInitialState(undefined, defaults), defaults);
});

test('isCommanderState rejects malformed saved state', () => {
  assert.equal(isCommanderState({ active: 0, panels: [{ dir: '/a' }, { dir: '/b', cursorName: 'c' }] }), true);
  assert.equal(isCommanderState({ active: 2, panels: [{ dir: '/a' }, { dir: '/b' }] }), false);
  assert.equal(isCommanderState({ active: 0, panels: [{ dir: '/a' }] }), false);
  assert.equal(isCommanderState(undefined), false);
});

test('describeError gives short messages', () => {
  assert.equal(describeError(Object.assign(new Error('x'), { code: 'EACCES' }), '/root'), 'Permission denied: /root');
  assert.equal(describeError(Object.assign(new Error('x'), { code: 'ENOENT' }), '/nope'), 'No such directory: /nope');
  assert.equal(describeError(new TimeoutError('timed out after 10 s'), '/mnt/nfs'), '/mnt/nfs: timed out after 10 s');
});

test('revealInState moves only the active panel to the file, cursor on it (ADR 0012)', () => {
  const state: CommanderState = { active: 1, panels: [{ dir: '/a', cursorName: 'x' }, { dir: '/b', cursorName: 'y' }] };
  assert.deepEqual(revealInState(state, '/p/src/main.ts'), {
    active: 1,
    panels: [{ dir: '/a', cursorName: 'x' }, { dir: '/p/src', cursorName: 'main.ts' }],
  });
});
