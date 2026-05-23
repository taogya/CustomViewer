// Trace: FR-012, FR-013, FR-014, FR-018, AC-001, AC-002, AC-004, AC-005
import * as vscode from "vscode";

import { PreviewManager } from "./previewManager";

export interface CommandDependencies {
  executeCommand(command: string, ...args: unknown[]): Thenable<unknown>;
  registerCommand(command: string, callback: (...args: unknown[]) => unknown): vscode.Disposable;
}

const defaultCommandDependencies: CommandDependencies = {
  executeCommand: (command, ...args) => vscode.commands.executeCommand(command, ...args),
  registerCommand: (command, callback) => vscode.commands.registerCommand(command, callback)
};

export function registerCommands(
  context: vscode.ExtensionContext,
  previewManager: PreviewManager,
  commandDependencies: CommandDependencies = defaultCommandDependencies
): void {
  context.subscriptions.push(
    commandDependencies.registerCommand("customViewer.openDefaultPreview", async () => {
      await previewManager.openDefaultPreview();
    }),
    commandDependencies.registerCommand("customViewer.chooseRendererPreview", async () => {
      await previewManager.chooseRendererPreview();
    }),
    commandDependencies.registerCommand("customViewer.openRendererStandalone", async () => {
      await previewManager.openRendererStandalone();
    }),
    commandDependencies.registerCommand("customViewer.rerenderPreview", async () => {
      await previewManager.rerenderPreview();
    }),
    commandDependencies.registerCommand("customViewer.openSettings", async () => {
      await commandDependencies.executeCommand("workbench.action.openSettings", "@ext:taogya.customviewer");
    })
  );
}