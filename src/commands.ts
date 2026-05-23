// Trace: FR-012, FR-013, FR-014, FR-018, AC-001, AC-002, AC-004, AC-005
import * as vscode from "vscode";

import { PreviewManager } from "./previewManager";

export function registerCommands(context: vscode.ExtensionContext, previewManager: PreviewManager): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("customViewer.openDefaultPreview", async () => {
      await previewManager.openDefaultPreview();
    }),
    vscode.commands.registerCommand("customViewer.chooseRendererPreview", async () => {
      await previewManager.chooseRendererPreview();
    }),
    vscode.commands.registerCommand("customViewer.openRendererStandalone", async () => {
      await previewManager.openRendererStandalone();
    }),
    vscode.commands.registerCommand("customViewer.rerenderPreview", async () => {
      await previewManager.rerenderPreview();
    })
  );
}