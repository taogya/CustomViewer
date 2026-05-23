// Trace: FR-022, FR-023, AC-006, AC-007
import * as path from "path";
import * as vscode from "vscode";

import { CustomViewerError } from "./errors";
import type { ResolvedRenderer } from "./rendererManifest";

export interface TrustFilterResult {
  renderers: ResolvedRenderer[];
  issues: CustomViewerError[];
}

export function filterRenderersForTrust(args: {
  renderers: ResolvedRenderer[];
  issues: CustomViewerError[];
  isTrusted: boolean;
  workspaceFolders?: readonly vscode.WorkspaceFolder[];
}): TrustFilterResult {
  if (args.isTrusted) {
    return { renderers: args.renderers, issues: args.issues };
  }

  const workspaceFolders = args.workspaceFolders ?? [];
  const filtered: ResolvedRenderer[] = [];
  const issues = [...args.issues];

  for (const renderer of args.renderers) {
    if (isUriInsideWorkspace(renderer.rootUri, workspaceFolders)) {
      issues.push(new CustomViewerError(
        "RendererBlockedByTrust",
        `Renderer '${renderer.id}' is blocked in Restricted Mode because it is located inside the workspace: ${renderer.rootUri.toString()}`,
        { id: renderer.id, path: renderer.rootUri.toString() }
      ));
      continue;
    }

    filtered.push(renderer);
  }

  return { renderers: filtered, issues };
}

export function isUriInsideWorkspace(
  targetUri: vscode.Uri,
  workspaceFolders: readonly vscode.WorkspaceFolder[]
): boolean {
  return workspaceFolders.some(folder => isUriInsideFolder(targetUri, folder.uri));
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