// Messages between the extension host and the webview, plus the compact entry encoding (ADR 0008).

/** Entry kind bit flags. A listing travels as parallel arrays (`names`, `kinds`), not one object per entry. */
export const KIND_DIR = 1;
export const KIND_LINK = 2;
export const KIND_BROKEN = 4;
/** Webview-only: the synthetic `..` entry. Never sent by the extension. */
export const KIND_UP = 8;

export type PanelIndex = 0 | 1;

export interface PanelState {
  dir: string;
  /** Name of the entry under the cursor, restored when the panel is reopened (ADR 0004). */
  cursorName?: string;
}

export interface CommanderState {
  active: PanelIndex;
  panels: [PanelState, PanelState];
}

export type ToWebview =
  /** `single`: show only the active panel (setting `vscommander.layout`, ADR 0014). */
  | { type: 'init'; state: CommanderState; single: boolean }
  | { type: 'layout'; single: boolean }
  /** Phase 1: names and kinds, sorted. `hasParent` is false at a filesystem root. */
  | { type: 'listing'; panel: PanelIndex; req: number; dir: string; hasParent: boolean; names: string[]; kinds: number[]; focusName?: string }
  /** Phase 2: sizes and mtimes for `names[start ..]`. -1 means stat failed. */
  | { type: 'stats'; panel: PanelIndex; req: number; start: number; sizes: number[]; mtimes: number[] }
  | { type: 'error'; panel: PanelIndex; req: number; message: string }
  /** Point the active panel at `dir` with the cursor on `name`: the file of the editor Ctrl+O came from (ADR 0012). */
  | { type: 'reveal'; dir: string; name: string }
  | { type: 'focus' };

export type FromWebview =
  | { type: 'ready' }
  /**
   * Load a listing. `child` is an entry name in `dir`, `..` for the parent, or `''` to reload `dir`.
   * `req` increases per panel; responses carrying an older `req` are ignored by the webview.
   */
  | { type: 'navigate'; panel: PanelIndex; req: number; dir: string; child: string; focusName?: string }
  | { type: 'open'; dir: string; names: string[]; preview: boolean }
  | { type: 'state'; state: CommanderState }
  /** Esc: close the commander tab and return to the editor (ADR 0013). */
  | { type: 'close' };
