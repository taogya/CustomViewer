// Trace: FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020, FR-021, AC-001, AC-002, AC-003, AC-004, AC-005
import * as path from "path";
import * as vscode from "vscode";

import { formatErrorMessage, type CustomViewerError } from "./errors";
import type { ResolvedRenderer } from "./rendererManifest";
import { normalizeExtension } from "./configuration";

export type LaunchMode = "file" | "standalone";

export interface PreviewRequest {
  renderer: ResolvedRenderer;
  launchMode: LaunchMode;
  sourceUri?: vscode.Uri;
  normalizedExtension?: string;
}

export interface PreviewPayload {
  sourceUri: string | null;
  fileName: string | null;
  normalizedExtension: string | null;
  savedTextContent: string | null;
  launchMode: LaunchMode;
  renderer: {
    id: string;
    displayName: string;
  };
  workspaceTrust: {
    isTrusted: boolean;
  };
}

export interface ResolutionResult {
  renderers: ResolvedRenderer[];
  issues: CustomViewerError[];
}

export interface TextEditorLike {
  document: {
    uri: vscode.Uri;
    fileName: string;
  };
  viewColumn?: vscode.ViewColumn;
}

export interface WebviewLike {
  html: string;
  cspSource: string;
  options?: vscode.WebviewOptions;
  asWebviewUri(uri: vscode.Uri): vscode.Uri;
  postMessage(message: unknown): Thenable<boolean>;
  onDidReceiveMessage(listener: (message: unknown) => void): vscode.Disposable;
}

export interface WebviewPanelLike {
  title: string;
  webview: WebviewLike;
  reveal(viewColumn?: vscode.ViewColumn): void;
  onDidDispose(listener: () => void): vscode.Disposable;
}

export interface WindowLike {
  activeTextEditor?: TextEditorLike;
  createWebviewPanel(
    viewType: string,
    title: string,
    showOptions: vscode.ViewColumn,
    options: vscode.WebviewOptions & vscode.WebviewPanelOptions
  ): WebviewPanelLike;
  showQuickPick<T extends vscode.QuickPickItem>(items: readonly T[], options?: vscode.QuickPickOptions): Thenable<T | undefined>;
  showErrorMessage(message: string): Thenable<string | undefined>;
}

export interface PreviewManagerDependencies {
  extensionUri: vscode.Uri;
  window: WindowLike;
  getIsTrusted(): boolean;
  resolveForExtension(extension: string, resource: vscode.Uri | undefined, isTrusted: boolean): Promise<ResolutionResult>;
  resolveAll(resource: vscode.Uri | undefined, isTrusted: boolean): Promise<ResolutionResult>;
  readTextFile(uri: vscode.Uri): Promise<string>;
  buildDocument(args: {
    rawHtml: string;
    rendererRootUri: vscode.Uri;
    mediaRootUri: vscode.Uri;
    webview: WebviewLike;
  }): string;
  log?(message: string, level?: "info" | "warn" | "error"): void;
}

interface PreviewSession {
  panel: WebviewPanelLike;
  request: PreviewRequest;
  bootstrapped: boolean;
  lastPayload?: PreviewPayload;
}

interface RendererPickItem extends vscode.QuickPickItem {
  renderer: ResolvedRenderer;
}

export class PreviewManager {
  private readonly sessions = new Map<string, PreviewSession>();
  private lastActivePanelKey: string | undefined;

  public constructor(private readonly dependencies: PreviewManagerDependencies) {}

  public async openDefaultPreview(): Promise<void> {
    const editor = this.dependencies.window.activeTextEditor;
    if (!editor) {
      await this.dependencies.window.showErrorMessage("CustomViewer requires an active text editor.");
      return;
    }

    const extension = normalizeExtension(path.extname(editor.document.fileName || editor.document.uri.fsPath));
    const result = await this.dependencies.resolveForExtension(extension, editor.document.uri, this.dependencies.getIsTrusted());
    if (result.renderers.length === 0) {
      await this.reportResolutionFailure(extension, result.issues);
      return;
    }

    await this.openPreview({
      renderer: result.renderers[0],
      launchMode: "file",
      sourceUri: editor.document.uri,
      normalizedExtension: extension
    });
  }

  public async chooseRendererPreview(): Promise<void> {
    const editor = this.dependencies.window.activeTextEditor;
    if (!editor) {
      await this.dependencies.window.showErrorMessage("CustomViewer requires an active text editor.");
      return;
    }

    const extension = normalizeExtension(path.extname(editor.document.fileName || editor.document.uri.fsPath));
    const result = await this.dependencies.resolveForExtension(extension, editor.document.uri, this.dependencies.getIsTrusted());
    if (result.renderers.length === 0) {
      await this.reportResolutionFailure(extension, result.issues);
      return;
    }

    const pick = await this.dependencies.window.showQuickPick<RendererPickItem>(
      result.renderers.map(renderer => ({
        label: renderer.displayName,
        description: renderer.id,
        detail: renderer.rootUri.toString(),
        renderer
      })),
      { placeHolder: `Choose a renderer for .${extension}` }
    );

    if (!pick) {
      return;
    }

    await this.openPreview({
      renderer: pick.renderer,
      launchMode: "file",
      sourceUri: editor.document.uri,
      normalizedExtension: extension
    });
  }

  public async openRendererStandalone(): Promise<void> {
    const result = await this.dependencies.resolveAll(undefined, this.dependencies.getIsTrusted());
    if (result.renderers.length === 0) {
      await this.reportResolutionFailure("any", result.issues);
      return;
    }

    const pick = await this.dependencies.window.showQuickPick<RendererPickItem>(
      result.renderers.map(renderer => ({
        label: renderer.displayName,
        description: `.${renderer.extension}`,
        detail: renderer.rootUri.toString(),
        renderer
      })),
      { placeHolder: "Choose a standalone renderer" }
    );

    if (!pick) {
      return;
    }

    await this.openPreview({
      renderer: pick.renderer,
      launchMode: "standalone"
    });
  }

  public async rerenderPreview(): Promise<void> {
    if (!this.lastActivePanelKey) {
      await this.dependencies.window.showErrorMessage("CustomViewer could not find an active preview session to rerender.");
      return;
    }

    const session = this.sessions.get(this.lastActivePanelKey);
    if (!session) {
      await this.dependencies.window.showErrorMessage("CustomViewer could not find an active preview session to rerender.");
      return;
    }

    const payload = await this.buildPayload(session.request);
    session.lastPayload = payload;
    await session.panel.webview.postMessage({ type: "rerender", payload });
  }

  private async openPreview(request: PreviewRequest): Promise<void> {
    const panelKey = this.buildPanelKey(request);
    const existing = this.sessions.get(panelKey);
    if (existing) {
      existing.panel.reveal(vscode.ViewColumn.Beside);
      this.lastActivePanelKey = panelKey;
      return;
    }

    const panel = this.dependencies.window.createWebviewPanel(
      "customViewer.preview",
      this.buildTitle(request),
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          request.renderer.rootUri,
          vscode.Uri.joinPath(this.dependencies.extensionUri, "media")
        ]
      }
    );

    const rawHtml = await this.dependencies.readTextFile(request.renderer.indexUri);
    panel.webview.html = this.dependencies.buildDocument({
      rawHtml,
      rendererRootUri: request.renderer.rootUri,
      mediaRootUri: vscode.Uri.joinPath(this.dependencies.extensionUri, "media"),
      webview: panel.webview
    });

    this.sessions.set(panelKey, {
      panel,
      request,
      bootstrapped: false
    });
    this.lastActivePanelKey = panelKey;

    panel.onDidDispose(() => {
      this.sessions.delete(panelKey);
      if (this.lastActivePanelKey === panelKey) {
        this.lastActivePanelKey = undefined;
      }
    });

    panel.webview.onDidReceiveMessage(async message => {
      await this.handleWebviewMessage(panelKey, message);
    });
  }

  private async handleWebviewMessage(panelKey: string, message: unknown): Promise<void> {
    const session = this.sessions.get(panelKey);
    if (!session || typeof message !== "object" || message === null) {
      return;
    }

    const typedMessage = message as { type?: string; level?: "info" | "warn" | "error"; message?: string };
    if (typedMessage.type === "renderer-ready") {
      const payload = await this.buildPayload(session.request);
      session.lastPayload = payload;
      await session.panel.webview.postMessage({
        type: session.bootstrapped ? "rerender" : "bootstrap",
        payload
      });
      session.bootstrapped = true;
      this.lastActivePanelKey = panelKey;
      return;
    }

    if (typedMessage.type === "renderer-log" && typedMessage.message) {
      this.dependencies.log?.(typedMessage.message, typedMessage.level ?? "info");
    }
  }

  private async buildPayload(request: PreviewRequest): Promise<PreviewPayload> {
    const sourceUri = request.sourceUri?.toString() ?? null;
    const fileName = request.sourceUri ? path.basename(request.sourceUri.fsPath || request.sourceUri.path) : null;
    const savedTextContent = request.sourceUri && request.launchMode === "file"
      ? await this.dependencies.readTextFile(request.sourceUri)
      : null;

    return {
      sourceUri,
      fileName,
      normalizedExtension: request.normalizedExtension ?? null,
      savedTextContent,
      launchMode: request.launchMode,
      renderer: {
        id: request.renderer.id,
        displayName: request.renderer.displayName
      },
      workspaceTrust: {
        isTrusted: this.dependencies.getIsTrusted()
      }
    };
  }

  private buildPanelKey(request: PreviewRequest): string {
    return [
      request.renderer.id,
      request.launchMode,
      request.sourceUri?.toString() ?? "standalone"
    ].join("|");
  }

  private buildTitle(request: PreviewRequest): string {
    if (request.launchMode === "standalone") {
      return `${request.renderer.displayName} Preview`;
    }

    const fileName = request.sourceUri ? path.basename(request.sourceUri.fsPath || request.sourceUri.path) : "Preview";
    return `${request.renderer.displayName}: ${fileName}`;
  }

  private async reportResolutionFailure(extension: string, issues: CustomViewerError[]): Promise<void> {
    if (issues.length > 0) {
      await this.dependencies.window.showErrorMessage(formatErrorMessage(issues[0]));
      return;
    }

    await this.dependencies.window.showErrorMessage(`No renderer is configured for .${extension}.`);
  }
}