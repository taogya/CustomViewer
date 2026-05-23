// Trace: FR-012, FR-013, FR-014, FR-018, AC-001, AC-002, AC-004, AC-005, AC-014
import * as assert from "assert";
import * as vscode from "vscode";

import { registerCommands, type CommandDependencies } from "../../src/commands";
import type { PreviewManager } from "../../src/previewManager";

suite("commands", () => {
  test("openSettings delegates to the filtered VS Code settings view", async () => {
    const context = { subscriptions: [] as vscode.Disposable[] } as unknown as vscode.ExtensionContext;
    const registeredCommands = new Map<string, (...args: unknown[]) => unknown>();
    const executedCommands: Array<{ command: string; args: unknown[] }> = [];

    const previewManager = {
      openDefaultPreview: async () => undefined,
      chooseRendererPreview: async () => undefined,
      openRendererStandalone: async () => undefined,
      rerenderPreview: async () => undefined
    } as unknown as PreviewManager;

    const commandDependencies: CommandDependencies = {
      registerCommand: (command, callback) => {
        registeredCommands.set(command, callback);
        return new vscode.Disposable(() => {
          registeredCommands.delete(command);
        });
      },
      executeCommand: async (command, ...args) => {
        executedCommands.push({ command, args });
        return undefined;
      }
    };

    registerCommands(context, previewManager, commandDependencies);

    const openSettings = registeredCommands.get("customViewer.openSettings");
    assert.ok(openSettings);

    await openSettings?.();

    assert.deepStrictEqual(executedCommands, [
      {
        command: "workbench.action.openSettings",
        args: ["@ext:taogya.customviewer"]
      }
    ]);
  });
});