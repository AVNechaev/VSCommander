// Webview UI: two flat panels (ADR 0001), virtualized rows (ADR 0008), MC-style keys (ADRs 0006, 0007, 0011).
import { KIND_BROKEN, KIND_DIR, KIND_LINK, KIND_UP } from '../protocol.ts';
import type { CommanderState, FromWebview, PanelIndex, PanelState, ToWebview } from '../protocol.ts';
import { qwertyChar } from './keys.ts';
import { buildEntries, extendQuickSearch, findPrefix, formatSize, formatTime } from './model.ts';
import type { Entry } from './model.ts';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void; setState(state: unknown): void };

const vscode = acquireVsCodeApi();
const post = (msg: FromWebview) => vscode.postMessage(msg);
// Any non-undefined state lets the panel serializer restore the tab after a window reload.
vscode.setState({ v: 1 });

/** Must match `.row { height }` in style.css. */
const ROW_HEIGHT = 22;

interface PanelElements {
  root: HTMLElement;
  path: HTMLElement;
  spinner: HTMLElement;
  viewport: HTMLElement;
  spacer: HTMLElement;
  rows: HTMLElement;
  status: HTMLElement;
}

interface Panel {
  index: PanelIndex;
  dir: string;
  entries: Entry[];
  cursor: number;
  /** Names of selected files (ADR 0002: used only to open several files at once in v1). */
  selected: Set<string>;
  /** Id of the latest navigate request; responses with an older id are ignored. */
  req: number;
  /** A navigate is in flight; the old listing stays visible and usable meanwhile (ADR 0008). */
  loading: boolean;
  error: string;
  el: PanelElements;
}

const container = document.getElementById('panels') as HTMLElement;
const panels: [Panel, Panel] = [makePanel(0), makePanel(1)];
let active: PanelIndex = 0;
/** Single-panel layout (ADR 0014): only the active panel is shown, and Tab doesn't switch. */
let single = true;
/** Quick search text; belongs to the active panel and is cleared by any non-typing key. */
let quickSearch = '';

// ---------- DOM ----------

function h(tag: string, className: string, parent: HTMLElement): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  parent.append(el);
  return el;
}

function makePanel(index: PanelIndex): Panel {
  const root = h('section', 'panel', container);
  const header = h('header', 'header', root);
  const spinner = h('span', 'spinner codicon codicon-loading codicon-modifier-spin', header);
  const path = h('span', 'path', header);
  const viewport = h('div', 'viewport', root);
  viewport.tabIndex = -1;
  const spacer = h('div', 'spacer', viewport);
  const rows = h('div', 'rows', viewport);
  const status = h('footer', 'status', root);
  const p: Panel = {
    index,
    dir: '',
    entries: [],
    cursor: 0,
    selected: new Set(),
    req: 0,
    loading: false,
    error: '',
    el: { root, path, spinner, viewport, spacer, rows, status },
  };

  viewport.addEventListener('scroll', schedule);
  root.addEventListener('mousedown', ev => {
    setActive(index);
    const row = (ev.target as HTMLElement).closest<HTMLElement>('.row');
    if (row) {
      quickSearch = '';
      setCursor(p, Number(row.dataset.index));
    }
    schedule();
  });
  viewport.addEventListener('dblclick', ev => {
    if ((ev.target as HTMLElement).closest('.row')) {
      enter(p);
      schedule();
    }
  });
  return p;
}

// ---------- rendering ----------

let frame = 0;
function schedule(): void {
  if (!frame) frame = requestAnimationFrame(render);
}

function render(): void {
  frame = 0;
  const now = Date.now();
  container.classList.toggle('single', single);
  for (const p of panels) renderPanel(p, now);
}

function renderPanel(p: Panel, now: number): void {
  const { el } = p;
  el.root.classList.toggle('active', p.index === active);
  el.path.textContent = p.dir;
  el.path.title = p.dir;
  el.spinner.hidden = !p.loading;
  el.spacer.style.height = `${p.entries.length * ROW_HEIGHT}px`;

  // Virtualization: only the rows inside the viewport exist in the DOM.
  const top = el.viewport.scrollTop;
  const first = Math.max(0, Math.floor(top / ROW_HEIGHT));
  const last = Math.min(p.entries.length, Math.ceil((top + el.viewport.clientHeight) / ROW_HEIGHT) + 1);
  const fragment = document.createDocumentFragment();
  for (let i = first; i < last; i++) fragment.append(renderRow(p, i, now));
  el.rows.replaceChildren(fragment);

  const [text, kind] = statusLine(p);
  el.status.textContent = text;
  el.status.className = `status ${kind}`;
}

function renderRow(p: Panel, i: number, now: number): HTMLElement {
  const e = p.entries[i];
  const row = document.createElement('div');
  row.className =
    'row' + (i === p.cursor ? ' cursor' : '') + (p.selected.has(e.name) ? ' selected' : '') + (e.kind & KIND_BROKEN ? ' broken' : '');
  row.style.top = `${i * ROW_HEIGHT}px`;
  row.dataset.index = String(i);
  const cell = (className: string, text = '') => {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    row.append(span);
  };
  cell(`codicon codicon-${icon(e)}`);
  cell('name', e.name);
  cell('size', formatSize(e));
  cell('time', e.kind & KIND_UP ? '' : formatTime(e.mtime, now));
  return row;
}

function icon(e: Entry): string {
  if (e.kind & KIND_UP) return 'arrow-up';
  if (e.kind & KIND_BROKEN) return 'warning';
  if (e.kind & KIND_LINK) return e.kind & KIND_DIR ? 'file-symlink-directory' : 'file-symlink-file';
  return e.kind & KIND_DIR ? 'folder' : 'file';
}

function statusLine(p: Panel): [string, string] {
  if (p.error) return [p.error, 'error'];
  if (p.index === active && quickSearch) return [`Search: ${quickSearch}`, 'search'];
  if (p.selected.size) return [`${p.selected.size} selected`, 'selection'];
  const e = p.entries[p.cursor];
  return [e && !(e.kind & KIND_UP) ? e.name : '', ''];
}

// ---------- cursor and panels ----------

function setActive(index: PanelIndex): void {
  if (active !== index) {
    active = index;
    quickSearch = '';
    saveStateSoon();
  }
  focusActive();
}

function focusActive(): void {
  panels[active].el.viewport.focus({ preventScroll: true });
}

function setCursor(p: Panel, index: number): void {
  p.cursor = Math.max(0, Math.min(p.entries.length - 1, index));
  const vp = p.el.viewport;
  const top = p.cursor * ROW_HEIGHT;
  if (top < vp.scrollTop) vp.scrollTop = top;
  else if (top + ROW_HEIGHT > vp.scrollTop + vp.clientHeight) vp.scrollTop = top + ROW_HEIGHT - vp.clientHeight;
  saveStateSoon();
}

function pageSize(p: Panel): number {
  return Math.max(1, Math.floor(p.el.viewport.clientHeight / ROW_HEIGHT) - 1);
}

// ---------- actions ----------

/** Load `child` of `dir` (the panel's current directory by default) into the panel. */
function navigate(p: Panel, child: string, focusName?: string, dir = p.dir): void {
  if (!dir) return;
  p.req++;
  p.loading = true;
  p.error = '';
  post({ type: 'navigate', panel: p.index, req: p.req, dir, child, focusName });
}

/** Enter: open the selection, or act on the cursor entry. */
function enter(p: Panel): void {
  if (p.selected.size) {
    const names = p.entries.filter(e => p.selected.has(e.name)).map(e => e.name);
    p.selected.clear();
    open(p, names, false);
    return;
  }
  const e = p.entries[p.cursor];
  if (!e) return;
  if (e.kind & KIND_UP) navigate(p, '..');
  else if (e.kind & KIND_BROKEN) p.error = `Broken symlink: ${e.name}`;
  else if (e.kind & KIND_DIR) navigate(p, e.name);
  else open(p, [e.name], false);
}

/** F3: preview the cursor file only, ignoring the selection (ADR 0007). */
function preview(p: Panel): void {
  const e = p.entries[p.cursor];
  if (!e || e.kind & KIND_DIR) return;
  if (e.kind & KIND_BROKEN) p.error = `Broken symlink: ${e.name}`;
  else open(p, [e.name], true);
}

function open(p: Panel, names: string[], preview: boolean): void {
  saveStateNow();
  post({ type: 'open', dir: p.dir, names, preview });
}

/** Insert / Ctrl+T: toggle selection of the cursor file and move down. Directories aren't selectable in v1. */
function toggleSelect(p: Panel): void {
  const e = p.entries[p.cursor];
  if (e && !(e.kind & (KIND_DIR | KIND_BROKEN))) {
    if (p.selected.has(e.name)) p.selected.delete(e.name);
    else p.selected.add(e.name);
  }
  setCursor(p, p.cursor + 1);
}

function reload(p: Panel): void {
  navigate(p, '', p.entries[p.cursor]?.name);
}

// ---------- keyboard ----------

/** Returns true if the commander handled the key (it is then kept from VS Code). */
function handleKey(e: KeyboardEvent): boolean {
  const p = panels[active];
  if (e.altKey || e.metaKey) return false;
  if (e.ctrlKey) {
    // By physical key, so these work in any layout. Ctrl+O is deliberately not handled: VS Code's keybinding toggles.
    switch (e.code) {
      case 'KeyT':
        quickSearch = '';
        toggleSelect(p);
        return true;
      case 'KeyR':
        quickSearch = '';
        reload(p);
        return true;
    }
    return false;
  }
  switch (e.key) {
    case 'ArrowUp':
      quickSearch = '';
      setCursor(p, p.cursor - 1);
      return true;
    case 'ArrowDown':
      quickSearch = '';
      setCursor(p, p.cursor + 1);
      return true;
    case 'PageUp':
      quickSearch = '';
      setCursor(p, p.cursor - pageSize(p));
      return true;
    case 'PageDown':
      quickSearch = '';
      setCursor(p, p.cursor + pageSize(p));
      return true;
    case 'Home':
      quickSearch = '';
      setCursor(p, 0);
      return true;
    case 'End':
      quickSearch = '';
      setCursor(p, p.entries.length - 1);
      return true;
    case 'Enter':
      quickSearch = '';
      enter(p);
      return true;
    case 'Tab':
      // Consumed even in single layout, so focus never leaves the commander.
      if (!single) setActive(active === 0 ? 1 : 0);
      return true;
    case 'Insert':
      quickSearch = '';
      toggleSelect(p);
      return true;
    case 'F3':
      quickSearch = '';
      preview(p);
      return true;
    case 'Escape':
      // First Esc clears the quick search; otherwise Esc closes the commander and returns to the editor (ADR 0013).
      if (quickSearch) quickSearch = '';
      else {
        saveStateNow();
        post({ type: 'close' });
      }
      return true;
    case 'Backspace': {
      if (!quickSearch) return false;
      quickSearch = quickSearch.slice(0, -1);
      const index = quickSearch ? findPrefix(p.entries, quickSearch) : -1;
      if (index >= 0) setCursor(p, index);
      return true;
    }
  }
  if ([...e.key].length === 1) {
    // Quick search (ADR 0011). A rejected character is still consumed, so it never reaches VS Code.
    const result = extendQuickSearch(p.entries, quickSearch, e.key, qwertyChar(e.code, e.shiftKey));
    if (result) {
      quickSearch = result.text;
      setCursor(p, result.index);
    }
    return true;
  }
  return false;
}

window.addEventListener(
  'keydown',
  e => {
    if (handleKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      schedule();
    }
  },
  true,
);

// ---------- state (ADR 0004) ----------

function panelState(p: Panel): PanelState {
  const e = p.entries[p.cursor];
  return { dir: p.dir, cursorName: e && !(e.kind & KIND_UP) ? e.name : undefined };
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function saveStateSoon(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveStateNow, 300);
}
function saveStateNow(): void {
  clearTimeout(saveTimer);
  if (!panels[0].dir || !panels[1].dir) return;
  const state: CommanderState = { active, panels: [panelState(panels[0]), panelState(panels[1])] };
  post({ type: 'state', state });
}

// ---------- messages from the extension ----------

window.addEventListener('message', (ev: MessageEvent<ToWebview>) => {
  const msg = ev.data;
  switch (msg.type) {
    case 'init':
      active = msg.state.active;
      single = msg.single;
      panels.forEach((p, i) => {
        p.dir = msg.state.panels[i].dir;
        navigate(p, '', msg.state.panels[i].cursorName);
      });
      focusActive();
      break;
    case 'listing': {
      const p = panels[msg.panel];
      if (msg.req !== p.req) return;
      p.dir = msg.dir;
      p.entries = buildEntries(msg.names, msg.kinds, msg.hasParent);
      p.selected.clear();
      p.loading = false;
      p.error = '';
      if (p.index === active) quickSearch = '';
      const index = msg.focusName ? p.entries.findIndex(e => e.name === msg.focusName && !(e.kind & KIND_UP)) : -1;
      p.el.viewport.scrollTop = 0;
      setCursor(p, Math.max(0, index));
      break;
    }
    case 'stats': {
      const p = panels[msg.panel];
      if (msg.req !== p.req) return;
      const offset = p.entries[0]?.kind & KIND_UP ? 1 : 0;
      for (let k = 0; k < msg.sizes.length; k++) {
        const e = p.entries[offset + msg.start + k];
        if (e) {
          e.size = msg.sizes[k];
          e.mtime = msg.mtimes[k];
        }
      }
      break;
    }
    case 'error': {
      const p = panels[msg.panel];
      if (msg.req !== p.req) return;
      p.loading = false;
      p.error = msg.message;
      break;
    }
    case 'reveal': {
      // Ctrl+O from a file (ADR 0012): if the file is already listed, just move the cursor; else (re)load its directory.
      const p = panels[active];
      quickSearch = '';
      const index = p.dir === msg.dir && !p.loading ? p.entries.findIndex(e => e.name === msg.name && !(e.kind & KIND_UP)) : -1;
      if (index >= 0) setCursor(p, index);
      else navigate(p, '', msg.name, msg.dir);
      break;
    }
    case 'layout':
      single = msg.single;
      break;
    case 'focus':
      focusActive();
      break;
  }
  schedule();
});

new ResizeObserver(schedule).observe(container);
post({ type: 'ready' });
