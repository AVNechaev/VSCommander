// Path rules for navigation and state restore. No vscode imports: unit-testable.
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { TimeoutError } from './listing.ts';
import type { CommanderState, PanelState } from './protocol.ts';

/**
 * Where a navigate request goes, and which entry the cursor should land on.
 * Paths are logical: going up from a followed directory symlink returns to the directory containing the link (ADR 0008).
 */
export function resolveNavigation(dir: string, child: string, focusName?: string): { target: string; focus?: string } {
  if (child === '..') return { target: path.dirname(dir), focus: path.basename(dir) };
  if (child === '') return { target: dir, focus: focusName };
  return { target: path.join(dir, child), focus: focusName };
}

export function hasParent(dir: string): boolean {
  return path.dirname(dir) !== dir;
}

export async function isDirectory(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

/** `dir` itself if it is an existing directory, else its nearest existing ancestor, else undefined. */
export async function nearestExistingDir(dir: string, exists: (p: string) => Promise<boolean> = isDirectory): Promise<string | undefined> {
  let cur = path.resolve(dir);
  for (;;) {
    if (await exists(cur)) return cur;
    const up = path.dirname(cur);
    if (up === cur) return undefined;
    cur = up;
  }
}

/**
 * The state to open the commander with (ADR 0004): the saved state if any, with each saved directory walked up to its
 * nearest existing ancestor; otherwise the defaults. The cursor name is kept only if the directory survived unchanged.
 */
export async function resolveInitialState(
  saved: CommanderState | undefined,
  defaults: CommanderState,
  exists: (p: string) => Promise<boolean> = isDirectory,
): Promise<CommanderState> {
  if (!saved) return defaults;
  const panels = await Promise.all(
    [0, 1].map(async (i): Promise<PanelState> => {
      const s = saved.panels[i];
      const dir = await nearestExistingDir(s.dir, exists);
      if (!dir) return defaults.panels[i];
      return dir === path.resolve(s.dir) ? { dir, cursorName: s.cursorName } : { dir };
    }),
  );
  return { active: saved.active, panels: [panels[0], panels[1]] };
}

/** `state` with the active panel moved to the directory of `file`, cursor on the file (ADR 0012). */
export function revealInState(state: CommanderState, file: string): CommanderState {
  const panels: [PanelState, PanelState] = [state.panels[0], state.panels[1]];
  panels[state.active] = { dir: path.dirname(file), cursorName: path.basename(file) };
  return { active: state.active, panels };
}

export function isCommanderState(x: unknown): x is CommanderState {
  const s = x as CommanderState;
  return (
    !!s &&
    (s.active === 0 || s.active === 1) &&
    Array.isArray(s.panels) &&
    s.panels.length === 2 &&
    s.panels.every(p => !!p && typeof p.dir === 'string' && (p.cursorName === undefined || typeof p.cursorName === 'string'))
  );
}

/** A short, user-facing message for a failed listing. */
export function describeError(err: unknown, dir: string): string {
  if (err instanceof TimeoutError) return `${dir}: ${err.message}`;
  const code = (err as NodeJS.ErrnoException)?.code;
  switch (code) {
    case 'EACCES':
    case 'EPERM':
      return `Permission denied: ${dir}`;
    case 'ENOENT':
      return `No such directory: ${dir}`;
    case 'ENOTDIR':
      return `Not a directory: ${dir}`;
    default:
      return `${dir}: ${err instanceof Error ? err.message : String(err)}`;
  }
}
