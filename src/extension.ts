// Trace: FR-001, FR-003, FR-012, FR-018, FR-022, FR-025, AC-001, AC-004, AC-006
import * as vscode from "vscode";

import { registerCommands } from "./commands";
import { readEffectiveConfiguration } from "./configuration";
import { buildPreviewDocument } from "./previewDocument";
import { PreviewManager } from "./previewManager";
import { resolveAllRenderers, resolveRenderersForExtension } from "./rendererResolver";

export function activate(context: vscode.ExtensionContext): void {
  const decoder = new TextDecoder();

  const previewManager = new PreviewManager({
    extensionUri: context.extensionUri,
    window: vscode.window,
    getIsTrusted: () => vscode.workspace.isTrusted,
    resolveForExtension: async (extension, resource, isTrusted) => {
      const configuration = readEffectiveConfiguration(resource, isTrusted, vscode.workspace);
      return resolveRenderersForExtension({
        extension,
        resource,
        isTrusted,
        configuration,
        workspaceFolders: vscode.workspace.workspaceFolders,
        fs: vscode.workspace.fs
      });
    },
    resolveAll: async (resource, isTrusted) => {
      const configuration = readEffectiveConfiguration(resource, isTrusted, vscode.workspace);
      return resolveAllRenderers({
        resource,
        isTrusted,
        configuration,
        workspaceFolders: vscode.workspace.workspaceFolders,
        fs: vscode.workspace.fs
      });
    },
    readTextFile: async (uri: vscode.Uri) => decoder.decode(await vscode.workspace.fs.readFile(uri)),
    buildDocument: buildPreviewDocument,
    log: (message, level = "info") => {
      const prefix = `[CustomViewer:${level}]`;
      console.log(prefix, message);
    }
  });

  registerCommands(context, previewManager);
}

export function deactivate(): void {
  // no-op
}