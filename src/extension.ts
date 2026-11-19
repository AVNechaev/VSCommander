import * as vscode from 'vscode';
import { Commander, VIEW_TYPE } from './commander.ts';

export function activate(context: vscode.ExtensionContext): void {
  const commander = new Commander(context);
  context.subscriptions.push(
    commander,
    vscode.commands.registerCommand('vscommander.open', () => commander.show()),
    vscode.commands.registerCommand('vscommander.toggle', () => commander.toggle()),
    // Restore the commander tab after a window reload.
    vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, {
      deserializeWebviewPanel: async panel => commander.attach(panel),
    }),
  );
}

export function deactivate(): void {}
