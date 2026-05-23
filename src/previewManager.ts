// Trace: FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020, FR-021, FR-024, FR-032, AC-001, AC-002, AC-003, AC-004, AC-005, AC-015, AC-016
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
  getWorkspaceFolder?(uri: vscode.Uri): vscode.WorkspaceFolder | undefined;
  resolveForExtension(extension: string, resource: vscode.Uri | undefined, isTrusted: boolean): Promise<ResolutionResult>;
  resolveAll(resource: vscode.Uri | undefined, isTrusted: boolean): Promise<ResolutionResult>;
  readTextFile(uri: vscode.Uri): Promise<string>;
  resourceExists?(uri: vscode.Uri): Promise<boolean>;
  openTextDocument?(uri: vscode.Uri): Thenable<unknown>;
  openExternal?(uri: vscode.Uri): Thenable<boolean>;
  buildDocument(args: {
    rawHtml: string;
    rendererRootUri: vscode.Uri;
    mediaRootUri: vscode.Uri;
    webview: WebviewLike;
  }): string;
  log?(message: string, level?: "info" | "warn" | "error"): void;
}

interface PreviewSession {
  key: string;
  panel: WebviewPanelLike;
  request: PreviewRequest;
  bootstrapped: boolean;
  lastPayload?: PreviewPayload;
}

interface RendererPickItem extends vscode.QuickPickItem {
  renderer: ResolvedRenderer;
}

const LOCAL_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".avif"]);

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
      this.lastActivePanelKey = existing.key;
      return;
    }

    const panel = this.dependencies.window.createWebviewPanel(
      "customViewer.preview",
      this.buildTitle(request),
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: this.buildLocalResourceRoots(request)
      }
    );

    const rawHtml = await this.dependencies.readTextFile(request.renderer.indexUri);
    panel.webview.html = this.dependencies.buildDocument({
      rawHtml,
      rendererRootUri: request.renderer.rootUri,
      mediaRootUri: vscode.Uri.joinPath(this.dependencies.extensionUri, "media"),
      webview: panel.webview
    });

    const session: PreviewSession = {
      key: panelKey,
      panel,
      request,
      bootstrapped: false
    };

    this.sessions.set(panelKey, session);
    this.lastActivePanelKey = session.key;

    panel.onDidDispose(() => {
      this.sessions.delete(session.key);
      if (this.lastActivePanelKey === session.key) {
        this.lastActivePanelKey = undefined;
      }
    });

    panel.webview.onDidReceiveMessage(async message => {
      await this.handleWebviewMessage(session, message);
    });
  }

  private async handleWebviewMessage(session: PreviewSession, message: unknown): Promise<void> {
    if (!this.sessions.has(session.key) || typeof message !== "object" || message === null) {
      return;
    }

    const typedMessage = message as {
      type?: string;
      level?: "info" | "warn" | "error";
      message?: string;
      href?: string;
      requestId?: string;
    };
    if (typedMessage.type === "renderer-ready") {
      const payload = await this.buildPayload(session.request);
      session.lastPayload = payload;
      await session.panel.webview.postMessage({
        type: session.bootstrapped ? "rerender" : "bootstrap",
        payload
      });
      session.bootstrapped = true;
      this.lastActivePanelKey = session.key;
      return;
    }

    if (typedMessage.type === "renderer-log" && typedMessage.message) {
      this.dependencies.log?.(typedMessage.message, typedMessage.level ?? "info");
      return;
    }

    if (typedMessage.type === "open-link" && typedMessage.href) {
      await this.openRequestedLink(session, typedMessage.href);
      return;
    }

    if (typedMessage.type === "resolve-image" && typedMessage.requestId && typedMessage.href) {
      const resolvedUri = await this.resolveRequestedImage(session, typedMessage.href);
      await session.panel.webview.postMessage({
        type: "resolve-image-result",
        requestId: typedMessage.requestId,
        resolvedUri
      });
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

  private buildLocalResourceRoots(request: PreviewRequest): vscode.Uri[] {
    const roots = [
      request.renderer.rootUri,
      vscode.Uri.joinPath(this.dependencies.extensionUri, "media")
    ];

    const sourceRoot = request.sourceUri ? this.getSourceResourceRoot(request.sourceUri) : undefined;
    if (sourceRoot) {
      roots.push(sourceRoot);
    }

    return roots;
  }

  private async openRequestedLink(session: PreviewSession, href: string): Promise<void> {
    const trimmedHref = href.trim();
    if (!trimmedHref) {
      return;
    }

    if (isExternalHref(trimmedHref)) {
      if (this.dependencies.openExternal) {
        await this.dependencies.openExternal(vscode.Uri.parse(trimmedHref));
      }
      return;
    }

    const targetUri = this.resolveSourceRelativeUri(session.request, trimmedHref);
    if (!targetUri || !this.isAllowedSourceTarget(session.request, targetUri)) {
      this.dependencies.log?.(`Blocked source-relative link outside allowed root: ${trimmedHref}`, "warn");
      return;
    }

    const documentUri = stripUriDecorations(targetUri);
    if (this.dependencies.resourceExists && !(await this.dependencies.resourceExists(documentUri))) {
      this.dependencies.log?.(`Source-relative link target was not found: ${documentUri.toString()}`, "warn");
      return;
    }

    if (await this.tryNavigateSourceTarget(session, documentUri)) {
      return;
    }

    if (this.dependencies.openTextDocument) {
      await this.dependencies.openTextDocument(documentUri);
    }
  }

  private async tryNavigateSourceTarget(session: PreviewSession, targetUri: vscode.Uri): Promise<boolean> {
    const targetExtension = normalizeExtension(path.extname(targetUri.fsPath || targetUri.path));
    if (!this.canRendererHandleTargetExtension(session.request, targetExtension)) {
      return false;
    }

    const nextRequest: PreviewRequest = {
      ...session.request,
      launchMode: "file",
      sourceUri: targetUri,
      normalizedExtension: targetExtension
    };
    const nextKey = this.buildPanelKey(nextRequest);
    const conflictingSession = this.sessions.get(nextKey);
    if (conflictingSession && conflictingSession !== session) {
      return false;
    }

    let payload: PreviewPayload;
    try {
      payload = await this.buildPayload(nextRequest);
    } catch (error) {
      this.dependencies.log?.(`Failed to navigate preview target: ${String(error)}`, "warn");
      return false;
    }

    this.rekeySession(session, nextRequest, nextKey);
    session.lastPayload = payload;
    session.panel.title = this.buildTitle(session.request);
    session.panel.webview.options = {
      ...(session.panel.webview.options ?? {}),
      localResourceRoots: this.buildLocalResourceRoots(session.request)
    };
    await session.panel.webview.postMessage({ type: "rerender", payload });
    return true;
  }

  private async resolveRequestedImage(session: PreviewSession, href: string): Promise<string | null> {
    const targetUri = this.resolveSourceRelativeUri(session.request, href);
    if (!targetUri || !this.isAllowedSourceTarget(session.request, targetUri)) {
      return null;
    }

    const imageUri = stripUriDecorations(targetUri);
    if (!isSupportedImageUri(imageUri)) {
      return null;
    }

    if (this.dependencies.resourceExists && !(await this.dependencies.resourceExists(imageUri))) {
      return null;
    }

    return session.panel.webview.asWebviewUri(imageUri).toString();
  }

  private resolveSourceRelativeUri(request: PreviewRequest, href: string): vscode.Uri | undefined {
    if (!request.sourceUri) {
      return undefined;
    }

    const trimmedHref = href.trim();
    if (!trimmedHref || trimmedHref.startsWith("#") || isExternalHref(trimmedHref) || trimmedHref.startsWith("/")) {
      return undefined;
    }

    const [pathPart, fragment = ""] = trimmedHref.split("#", 2);
    const [resourcePath] = pathPart.split("?", 1);
    if (!resourcePath) {
      return undefined;
    }

    const baseDirectory = getDirectoryUri(request.sourceUri);
    const segments = resourcePath.split(/[\\/]+/).filter(Boolean);
    const resolved = vscode.Uri.joinPath(baseDirectory, ...segments);
    return fragment ? resolved.with({ fragment }) : resolved;
  }

  private getSourceResourceRoot(sourceUri: vscode.Uri): vscode.Uri | undefined {
    const workspaceFolder = this.dependencies.getWorkspaceFolder?.(sourceUri);
    if (workspaceFolder) {
      return this.dependencies.getIsTrusted() ? workspaceFolder.uri : undefined;
    }

    return getDirectoryUri(sourceUri);
  }

  private isAllowedSourceTarget(request: PreviewRequest, targetUri: vscode.Uri): boolean {
    if (!request.sourceUri) {
      return false;
    }

    const root = this.getSourceResourceRoot(request.sourceUri);
    if (!root) {
      return false;
    }

    return isUriInsideFolder(stripUriDecorations(targetUri), stripUriDecorations(root));
  }

  private canRendererHandleTargetExtension(request: PreviewRequest, targetExtension: string): boolean {
    if (!targetExtension) {
      return false;
    }

    const supportedExtensions = request.renderer.manifest?.supportedExtensions
      ?.map(entry => normalizeExtension(entry))
      .filter((entry): entry is string => Boolean(entry));

    if (supportedExtensions && supportedExtensions.length > 0) {
      return supportedExtensions.includes(targetExtension);
    }

    return request.normalizedExtension === targetExtension || request.renderer.extension === targetExtension;
  }

  private rekeySession(session: PreviewSession, nextRequest: PreviewRequest, nextKey: string): void {
    if (session.key !== nextKey) {
      this.sessions.delete(session.key);
      session.key = nextKey;
      this.sessions.set(nextKey, session);
    }

    session.request = nextRequest;
    this.lastActivePanelKey = session.key;
  }
}

function getDirectoryUri(uri: vscode.Uri): vscode.Uri {
  return uri.with({ path: path.posix.dirname(uri.path) });
}

function stripUriDecorations(uri: vscode.Uri): vscode.Uri {
  return uri.with({ query: "", fragment: "" });
}

function isExternalHref(value: string): boolean {
  return value.startsWith("http://")
    || value.startsWith("https://")
    || value.startsWith("mailto:");
}

function isSupportedImageUri(uri: vscode.Uri): boolean {
  return LOCAL_IMAGE_EXTENSIONS.has(path.extname(uri.path).toLowerCase());
}

function isUriInsideFolder(targetUri: vscode.Uri, folderUri: vscode.Uri): boolean {
  if (targetUri.scheme !== folderUri.scheme || targetUri.authority !== folderUri.authority) {
    if (targetUri.scheme === "file" && folderUri.scheme === "file") {
      const normalizedTarget = normalizeFsPath(targetUri.fsPath);
      const normalizedFolder = normalizeFsPath(folderUri.fsPath);
      return normalizedTarget === normalizedFolder || normalizedTarget.startsWith(`${normalizedFolder}${path.sep}`);
    }

    return false;
  }

  const folder = folderUri.toString().replace(/\/+$/, "");
  const target = targetUri.toString();
  return target === folder || target.startsWith(`${folder}/`);
}

function normalizeFsPath(input: string): string {
  return path.normalize(input).replace(/[\\/]+$/, "");
}