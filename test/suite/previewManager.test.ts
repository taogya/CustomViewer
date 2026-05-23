// Trace: FR-012, FR-013, FR-014, FR-015, FR-016, FR-018, FR-019, AC-001, AC-003, AC-004, AC-005, AC-014
import * as assert from "assert";
import * as vscode from "vscode";

import { PreviewManager } from "../../src/previewManager";
import type { ResolutionResult, TextEditorLike, WebviewLike, WebviewPanelLike, WindowLike } from "../../src/previewManager";
import type { ResolvedRenderer } from "../../src/rendererManifest";

suite("previewManager", () => {
  test("openDefaultPreview uses saved file content for bootstrap", async () => {
    const window = new FakeWindow();
    const fileUri = vscode.Uri.file("/tmp/example.md");
    window.activeTextEditor = {
      document: { uri: fileUri, fileName: fileUri.fsPath },
      viewColumn: vscode.ViewColumn.One
    };

    const renderer = createRenderer("docs", "md");
    const manager = createManager(window, {
      resolveForExtension: async () => ({ renderers: [renderer], issues: [] }),
      readTextFile: async (uri) => uri.fsPath.endsWith("index.html")
        ? "<!DOCTYPE html><html><head></head><body></body></html>"
        : "saved markdown"
    });

    await manager.openDefaultPreview();
    await window.lastPanel?.webview.emit({ type: "renderer-ready" });

    const bootstrap = window.lastPanel?.webview.messages[0] as { type: string; payload: { savedTextContent: string } };
    assert.strictEqual(bootstrap.type, "bootstrap");
    assert.strictEqual(bootstrap.payload.savedTextContent, "saved markdown");
  });

  test("reuses an existing panel for the same renderer and source", async () => {
    const window = new FakeWindow();
    const fileUri = vscode.Uri.file("/tmp/example.md");
    window.activeTextEditor = {
      document: { uri: fileUri, fileName: fileUri.fsPath },
      viewColumn: vscode.ViewColumn.One
    };

    const renderer = createRenderer("docs", "md");
    const manager = createManager(window, {
      resolveForExtension: async () => ({ renderers: [renderer], issues: [] })
    });

    await manager.openDefaultPreview();
    await manager.openDefaultPreview();

    assert.strictEqual(window.createdPanels.length, 1);
    assert.strictEqual(window.lastPanel?.revealCount, 1);
  });

  test("chooseRendererPreview opens the selected renderer", async () => {
    const window = new FakeWindow();
    const fileUri = vscode.Uri.file("/tmp/example.md");
    window.activeTextEditor = {
      document: { uri: fileUri, fileName: fileUri.fsPath },
      viewColumn: vscode.ViewColumn.One
    };

    const first = createRenderer("docs", "md");
    const second = createRenderer("alternate", "md");
    window.quickPickStrategy = items => items[1];

    const manager = createManager(window, {
      resolveForExtension: async () => ({ renderers: [first, second], issues: [] })
    });

    await manager.chooseRendererPreview();
    await window.lastPanel?.webview.emit({ type: "renderer-ready" });

    const bootstrap = window.lastPanel?.webview.messages[0] as { payload: { renderer: { id: string } } };
    assert.strictEqual(bootstrap.payload.renderer.id, "alternate");
  });

  test("openRendererStandalone boots without source content", async () => {
    const window = new FakeWindow();
    const renderer = createRenderer("standalone", "json");

    const manager = createManager(window, {
      resolveAll: async () => ({ renderers: [renderer], issues: [] })
    });

    await manager.openRendererStandalone();
    await window.lastPanel?.webview.emit({ type: "renderer-ready" });

    const bootstrap = window.lastPanel?.webview.messages[0] as { payload: { launchMode: string; savedTextContent: string | null } };
    assert.strictEqual(bootstrap.payload.launchMode, "standalone");
    assert.strictEqual(bootstrap.payload.savedTextContent, null);
  });

  test("rerenderPreview posts updated saved content", async () => {
    const window = new FakeWindow();
    const fileUri = vscode.Uri.file("/tmp/example.md");
    window.activeTextEditor = {
      document: { uri: fileUri, fileName: fileUri.fsPath },
      viewColumn: vscode.ViewColumn.One
    };

    let savedContent = "initial content";
    const manager = createManager(window, {
      resolveForExtension: async () => ({ renderers: [createRenderer("docs", "md")], issues: [] }),
      readTextFile: async (uri) => uri.fsPath.endsWith("index.html")
        ? "<!DOCTYPE html><html><head></head><body></body></html>"
        : savedContent
    });

    await manager.openDefaultPreview();
    await window.lastPanel?.webview.emit({ type: "renderer-ready" });
    savedContent = "updated content";
    await manager.rerenderPreview();

    const rerender = window.lastPanel?.webview.messages[1] as { type: string; payload: { savedTextContent: string } };
    assert.strictEqual(rerender.type, "rerender");
    assert.strictEqual(rerender.payload.savedTextContent, "updated content");
  });
});

function createManager(window: FakeWindow, overrides: Partial<ManagerOverrides> = {}): PreviewManager {
  const resolveForExtension = overrides.resolveForExtension ?? (async () => ({ renderers: [], issues: [] }));
  const resolveAll = overrides.resolveAll ?? (async () => ({ renderers: [], issues: [] }));
  const readTextFile = overrides.readTextFile ?? (async (uri) => uri.fsPath.endsWith("index.html")
    ? "<!DOCTYPE html><html><head></head><body></body></html>"
    : "saved content");

  return new PreviewManager({
    extensionUri: vscode.Uri.file("/tmp/extension"),
    window,
    getIsTrusted: () => true,
    resolveForExtension,
    resolveAll,
    readTextFile,
    buildDocument: ({ rawHtml }) => rawHtml
  });
}

function createRenderer(id: string, extension: string): ResolvedRenderer {
  const rootUri = vscode.Uri.file(`/tmp/${id}`);
  return {
    extension,
    id,
    displayName: id,
    source: "explicit",
    rootUri,
    indexUri: vscode.Uri.joinPath(rootUri, "index.html")
  };
}

interface ManagerOverrides {
  resolveForExtension(): Promise<ResolutionResult>;
  resolveAll(): Promise<ResolutionResult>;
  readTextFile(uri: vscode.Uri): Promise<string>;
}

class FakeWindow implements WindowLike {
  public activeTextEditor: TextEditorLike | undefined = undefined;
  public createdPanels: FakePanel[] = [];
  public quickPickStrategy: ((items: readonly any[]) => any) | undefined;

  public get lastPanel(): FakePanel | undefined {
    return this.createdPanels[this.createdPanels.length - 1];
  }

  public createWebviewPanel(_viewType: string, title: string): FakePanel {
    const panel = new FakePanel(title);
    this.createdPanels.push(panel);
    return panel;
  }

  public async showQuickPick<T extends vscode.QuickPickItem>(items: readonly T[]): Promise<T | undefined> {
    if (this.quickPickStrategy) {
      return this.quickPickStrategy(items);
    }
    return items[0];
  }

  public async showErrorMessage(_message: string): Promise<string | undefined> {
    return undefined;
  }
}

class FakePanel implements WebviewPanelLike {
  public readonly webview = new FakeWebview();
  public revealCount = 0;
  private disposeListener: (() => void) | undefined;

  public constructor(public title: string) {}

  public reveal(): void {
    this.revealCount += 1;
  }

  public onDidDispose(listener: () => void): vscode.Disposable {
    this.disposeListener = listener;
    return new vscode.Disposable(() => {
      this.disposeListener = undefined;
    });
  }
}

class FakeWebview implements WebviewLike {
  public html = "";
  public cspSource = "vscode-webview://fake";
  public options = undefined;
  public readonly messages: unknown[] = [];
  private listener: ((message: unknown) => void) | undefined;

  public asWebviewUri(uri: vscode.Uri): vscode.Uri {
    return uri;
  }

  public async postMessage(message: unknown): Promise<boolean> {
    this.messages.push(message);
    return true;
  }

  public onDidReceiveMessage(listener: (message: unknown) => void): vscode.Disposable {
    this.listener = listener;
    return new vscode.Disposable(() => {
      this.listener = undefined;
    });
  }

  public async emit(message: unknown): Promise<void> {
    await this.listener?.(message);
  }
}