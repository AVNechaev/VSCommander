// The commander: one webview editor tab with two panels (ADR 0005), and the Ctrl+O toggle (ADR 0006).
import * as vscode from 'vscode';
import * as os from 'node:os';
import * as path from 'node:path';
import { readNames, readStats, withTimeout } from './listing.ts';
import { describeError, hasParent, isCommanderState, resolveInitialState, resolveNavigation } from './paths.ts';
import type { CommanderState, FromWebview, PanelIndex, ToWebview } from './protocol.ts';

export const VIEW_TYPE = 'vscommander';
const STATE_KEY = 'vscommander.state';
const STAT_BATCH = 1000;
const TIMEOUT_MS = 10_000;

export class Commander implements vscode.Disposable {
  private readonly context: vscode.ExtensionContext;
  private panel: vscode.WebviewPanel | undefined;
  private panelDisposables: vscode.Disposable[] = [];
  /** Per-panel token for the listing in flight; a newer navigate makes older loads drop their results. */
  private loadToken: [object, object] = [{}, {}];
  /** The last editor tab that was not the commander: target of the return half of the toggle. */
  private lastEditor: vscode.Uri | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.disposables.push(
      vscode.window.tabGroups.onDidChangeTabs(() => this.trackLastEditor()),
      vscode.window.tabGroups.onDidChangeTabGroups(() => this.trackLastEditor()),
    );
    this.trackLastEditor();
  }

  dispose(): void {
    this.panel?.dispose();
    for (const d of this.disposables) d.dispose();
  }

  /** Reveal and focus the commander, creating it in the active editor group if needed. */
  show(): void {
    if (this.panel) {
      this.panel.reveal(this.panel.viewColumn, false);
      this.post({ type: 'focus' });
      return;
    }
    // retainContextWhenHidden: every file open hides the commander behind the file's tab (ADR 0006); Ctrl+O must
    // come back instantly with scroll position, selection and quick search intact, not re-list from saved state.
    const panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      'Commander',
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
      { retainContextWhenHidden: true },
    );
    this.attach(panel);
  }

  /** Ctrl+O: from the commander, back to the previous editor; from anywhere else, to the commander. */
  async toggle(): Promise<void> {
    if (this.panel?.active) await this.returnToEditor();
    else this.show();
  }

  /** Wire up a new or restored (after reload) webview panel. */
  attach(panel: vscode.WebviewPanel): void {
    this.panel = panel;
    const dist = vscode.Uri.joinPath(this.context.extensionUri, 'dist');
    panel.webview.options = { enableScripts: true, localResourceRoots: [dist] };
    panel.webview.html = this.html(panel.webview, dist);
    this.panelDisposables.push(
      panel.webview.onDidReceiveMessage((msg: FromWebview) => this.onMessage(msg)),
      panel.onDidChangeViewState(e => {
        if (e.webviewPanel.active) this.post({ type: 'focus' });
      }),
      panel.onDidDispose(() => {
        this.panel = undefined;
        for (const d of this.panelDisposables) d.dispose();
        this.panelDisposables = [];
      }),
    );
  }

  private post(msg: ToWebview): void {
    void this.panel?.webview.postMessage(msg);
  }

  private async onMessage(msg: FromWebview): Promise<void> {
    switch (msg.type) {
      case 'ready':
        this.post({ type: 'init', state: await this.initialState() });
        break;
      case 'navigate':
        await this.load(msg.panel, msg.req, msg.dir, msg.child, msg.focusName);
        break;
      case 'open':
        await this.open(msg.dir, msg.names, msg.preview);
        break;
      case 'state':
        await this.memento().update(STATE_KEY, msg.state);
        break;
    }
  }

  // ---------- state (ADR 0004) ----------

  /** Workspace windows keep their own state; windows with no workspace share one global state. */
  private memento(): vscode.Memento {
    return vscode.workspace.workspaceFolders?.length ? this.context.workspaceState : this.context.globalState;
  }

  private async initialState(): Promise<CommanderState> {
    const home = os.homedir();
    const root = vscode.workspace.workspaceFolders?.find(f => f.uri.scheme === 'file')?.uri.fsPath;
    const defaults: CommanderState = { active: 0, panels: [{ dir: root ?? home }, { dir: home }] };
    const saved = this.memento().get<unknown>(STATE_KEY);
    return resolveInitialState(isCommanderState(saved) ? saved : undefined, defaults);
  }

  // ---------- listings (ADR 0008) ----------

  private async load(panel: PanelIndex, req: number, dir: string, child: string, focusName?: string): Promise<void> {
    const token = {};
    this.loadToken[panel] = token;
    const current = () => this.loadToken[panel] === token;
    const { target, focus } = resolveNavigation(dir, child, focusName);
    try {
      const { names, kinds } = await withTimeout(readNames(target), TIMEOUT_MS);
      if (!current()) return;
      this.post({ type: 'listing', panel, req, dir: target, hasParent: hasParent(target), names, kinds, focusName: focus });
      for (let start = 0; start < names.length; start += STAT_BATCH) {
        const { sizes, mtimes } = await withTimeout(readStats(target, names, start, start + STAT_BATCH), TIMEOUT_MS);
        if (!current()) return;
        this.post({ type: 'stats', panel, req, start, sizes, mtimes });
      }
    } catch (err) {
      if (current()) this.post({ type: 'error', panel, req, message: describeError(err, target) });
    }
  }

  // ---------- opening files (ADRs 0006, 0007) ----------

  /** Open in the commander's group; focus moves to the file (the last one, for several). */
  private async open(dir: string, names: string[], preview: boolean): Promise<void> {
    const viewColumn = this.panel?.viewColumn;
    for (const name of names) {
      const uri = vscode.Uri.file(path.join(dir, name));
      try {
        await vscode.commands.executeCommand('vscode.open', uri, { viewColumn, preview, preserveFocus: false });
      } catch (err) {
        void vscode.window.showErrorMessage(`Cannot open ${uri.fsPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // ---------- toggle (ADR 0006) ----------

  private trackLastEditor(): void {
    const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
    if (input instanceof vscode.TabInputText || input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputNotebook) {
      this.lastEditor = input.uri;
    }
  }

  private async returnToEditor(): Promise<void> {
    const target = this.lastEditor?.toString();
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input as { uri?: vscode.Uri } | undefined;
        if (target && input?.uri?.toString() === target) {
          await vscode.commands.executeCommand('vscode.open', input.uri, { viewColumn: group.viewColumn, preserveFocus: false });
          return;
        }
      }
    }
    // The last editor was closed: fall back to whatever was used before the commander in its group.
    await vscode.commands.executeCommand('workbench.action.openPreviousRecentlyUsedEditorInGroup');
  }

  // ---------- html ----------

  private html(webview: vscode.Webview, dist: vscode.Uri): string {
    const nonce = Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
    const uri = (...p: string[]) => webview.asWebviewUri(vscode.Uri.joinPath(dist, ...p));
    const csp = webview.cspSource;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp}; font-src ${csp}; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${uri('codicons', 'codicon.css')}">
<link rel="stylesheet" href="${uri('webview.css')}">
</head>
<body>
<div id="panels"></div>
<script nonce="${nonce}" src="${uri('webview.js')}"></script>
</body>
</html>`;
  }
}
