// Directory reading, in two phases so names appear before stats (ADR 0008). No vscode imports: unit-testable.
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { KIND_BROKEN, KIND_DIR, KIND_LINK } from './protocol.ts';

export interface Names {
  names: string[];
  kinds: number[];
}

export interface Stats {
  sizes: number[];
  mtimes: number[];
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Directories first, then files; natural, case-insensitive name order with a deterministic tie-break. */
export function compareEntries(a: { name: string; kind: number }, b: { name: string; kind: number }): number {
  const ad = a.kind & KIND_DIR;
  const bd = b.kind & KIND_DIR;
  if (ad !== bd) return ad ? -1 : 1;
  return collator.compare(a.name, b.name) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

/** Phase 1: entry names and kinds. Symlinks are resolved so links to directories sort and behave as directories. */
export async function readNames(dir: string): Promise<Names> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const items = await Promise.all(
    dirents.map(async d => {
      let kind = d.isDirectory() ? KIND_DIR : 0;
      if (d.isSymbolicLink()) {
        kind = KIND_LINK;
        try {
          if ((await fs.stat(path.join(dir, d.name))).isDirectory()) kind |= KIND_DIR;
        } catch {
          kind |= KIND_BROKEN;
        }
      }
      return { name: d.name, kind };
    }),
  );
  items.sort(compareEntries);
  return { names: items.map(i => i.name), kinds: items.map(i => i.kind) };
}

/** Phase 2: size and mtime for `names[start, end)`. Follows symlinks; falls back to the link itself; -1 if both fail. */
export async function readStats(dir: string, names: readonly string[], start: number, end: number): Promise<Stats> {
  const results = await Promise.all(
    names.slice(start, end).map(name => {
      const p = path.join(dir, name);
      return fs.stat(p).catch(() => fs.lstat(p)).catch(() => undefined);
    }),
  );
  return {
    sizes: results.map(s => (s ? s.size : -1)),
    mtimes: results.map(s => (s ? Math.round(s.mtimeMs) : -1)),
  };
}

export class TimeoutError extends Error {}

/** Rejects with TimeoutError after `ms`. The underlying fs call keeps running (it can't be cancelled); its result is dropped. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(`timed out after ${Math.round(ms / 1000)} s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
