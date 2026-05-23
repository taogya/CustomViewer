// Trace: FR-003, FR-004, FR-005, FR-007, FR-020, FR-021, FR-022, FR-023, AC-001, AC-002, AC-003, AC-006, AC-007, AC-008
import * as vscode from "vscode";

import {
  EffectiveConfiguration,
  normalizeExtension,
  resolveConfiguredPath,
  type RendererMappingEntry
} from "./configuration";
import { CustomViewerError } from "./errors";
import { loadRendererDefinition, type FileSystemLike, type ResolvedRenderer } from "./rendererManifest";
import { filterRenderersForTrust } from "./trustPolicy";

export interface ResolutionResult {
  renderers: ResolvedRenderer[];
  issues: CustomViewerError[];
}

export interface ResolutionOptions {
  extension: string;
  configuration: EffectiveConfiguration;
  resource?: vscode.Uri;
  isTrusted: boolean;
  workspaceFolders?: readonly vscode.WorkspaceFolder[];
  fs: FileSystemLike;
}

export async function resolveRenderersForExtension(options: ResolutionOptions): Promise<ResolutionResult> {
  const extension = normalizeExtension(options.extension);
  const renderers: ResolvedRenderer[] = [];
  const issues: CustomViewerError[] = [];
  const seen = new Set<string>();

  for (const entry of options.configuration.extensionRendererMap[extension] ?? []) {
    await resolveExplicitEntry({
      entry,
      extension,
      renderers,
      issues,
      seen,
      resource: options.resource,
      workspaceFolders: options.workspaceFolders,
      fs: options.fs
    });
  }

  for (const rootPath of options.configuration.rendererRoots) {
    await resolveConventionRenderers({
      rootPath,
      extension,
      renderers,
      issues,
      seen,
      resource: options.resource,
      workspaceFolders: options.workspaceFolders,
      fs: options.fs
    });
  }

  return filterRenderersForTrust({
    renderers,
    issues,
    isTrusted: options.isTrusted,
    workspaceFolders: options.workspaceFolders
  });
}

export async function resolveAllRenderers(args: {
  configuration: EffectiveConfiguration;
  resource?: vscode.Uri;
  isTrusted: boolean;
  workspaceFolders?: readonly vscode.WorkspaceFolder[];
  fs: FileSystemLike;
}): Promise<ResolutionResult> {
  const renderers: ResolvedRenderer[] = [];
  const issues: CustomViewerError[] = [];
  const seen = new Set<string>();

  for (const [extension, entries] of Object.entries(args.configuration.extensionRendererMap)) {
    for (const entry of entries) {
      await resolveExplicitEntry({
        entry,
        extension,
        renderers,
        issues,
        seen,
        resource: args.resource,
        workspaceFolders: args.workspaceFolders,
        fs: args.fs
      });
    }
  }

  for (const rootPath of args.configuration.rendererRoots) {
    await resolveAllFromRoot({
      rootPath,
      renderers,
      issues,
      seen,
      resource: args.resource,
      workspaceFolders: args.workspaceFolders,
      fs: args.fs
    });
  }

  return filterRenderersForTrust({
    renderers,
    issues,
    isTrusted: args.isTrusted,
    workspaceFolders: args.workspaceFolders
  });
}

async function resolveExplicitEntry(args: {
  entry: RendererMappingEntry;
  extension: string;
  renderers: ResolvedRenderer[];
  issues: CustomViewerError[];
  seen: Set<string>;
  resource?: vscode.Uri;
  workspaceFolders?: readonly vscode.WorkspaceFolder[];
  fs: FileSystemLike;
}): Promise<void> {
  const pathResult = resolveConfiguredPath(args.entry.path, {
    resource: args.resource,
    workspaceFolders: args.workspaceFolders
  });
  if (pathResult.error) {
    args.issues.push(pathResult.error);
    return;
  }

  try {
    const renderer = await loadRendererDefinition({
      fs: args.fs,
      extension: args.extension,
      source: "explicit",
      rootUri: pathResult.uri!,
      fallbackId: args.entry.id,
      fallbackDisplayName: args.entry.displayName
    });
    appendRenderer(args.renderers, args.seen, renderer);
  } catch (error) {
    args.issues.push(toCustomViewerError(error));
  }
}

async function resolveConventionRenderers(args: {
  rootPath: string;
  extension: string;
  renderers: ResolvedRenderer[];
  issues: CustomViewerError[];
  seen: Set<string>;
  resource?: vscode.Uri;
  workspaceFolders?: readonly vscode.WorkspaceFolder[];
  fs: FileSystemLike;
}): Promise<void> {
  const rootResult = resolveConfiguredPath(args.rootPath, {
    resource: args.resource,
    workspaceFolders: args.workspaceFolders
  });
  if (rootResult.error) {
    args.issues.push(rootResult.error);
    return;
  }

  try {
    await args.fs.stat(rootResult.uri!);
  } catch {
    args.issues.push(new CustomViewerError(
      "RendererPathInvalid",
      `Renderer root path is not valid in the current execution environment: ${rootResult.uri!.toString()}`,
      { path: rootResult.uri!.toString() }
    ));
    return;
  }

  const extensionRoot = vscode.Uri.joinPath(rootResult.uri!, "by-extension", args.extension);
  let entries: [string, vscode.FileType][];
  try {
    entries = await args.fs.readDirectory(extensionRoot);
  } catch {
    return;
  }

  for (const [name, type] of entries) {
    if (type !== vscode.FileType.Directory) {
      continue;
    }

    try {
      const renderer = await loadRendererDefinition({
        fs: args.fs,
        extension: args.extension,
        source: "root",
        rootUri: vscode.Uri.joinPath(extensionRoot, name),
        fallbackId: name
      });
      appendRenderer(args.renderers, args.seen, renderer);
    } catch (error) {
      args.issues.push(toCustomViewerError(error));
    }
  }
}

async function resolveAllFromRoot(args: {
  rootPath: string;
  renderers: ResolvedRenderer[];
  issues: CustomViewerError[];
  seen: Set<string>;
  resource?: vscode.Uri;
  workspaceFolders?: readonly vscode.WorkspaceFolder[];
  fs: FileSystemLike;
}): Promise<void> {
  const rootResult = resolveConfiguredPath(args.rootPath, {
    resource: args.resource,
    workspaceFolders: args.workspaceFolders
  });
  if (rootResult.error) {
    args.issues.push(rootResult.error);
    return;
  }

  try {
    await args.fs.stat(rootResult.uri!);
  } catch {
    args.issues.push(new CustomViewerError(
      "RendererPathInvalid",
      `Renderer root path is not valid in the current execution environment: ${rootResult.uri!.toString()}`,
      { path: rootResult.uri!.toString() }
    ));
    return;
  }

  const byExtensionUri = vscode.Uri.joinPath(rootResult.uri!, "by-extension");
  let extensionEntries: [string, vscode.FileType][];
  try {
    extensionEntries = await args.fs.readDirectory(byExtensionUri);
  } catch {
    return;
  }

  for (const [extension, type] of extensionEntries) {
    if (type !== vscode.FileType.Directory) {
      continue;
    }

    await resolveConventionRenderers({
      rootPath: args.rootPath,
      extension,
      renderers: args.renderers,
      issues: args.issues,
      seen: args.seen,
      resource: args.resource,
      workspaceFolders: args.workspaceFolders,
      fs: args.fs
    });
  }
}

function appendRenderer(renderers: ResolvedRenderer[], seen: Set<string>, renderer: ResolvedRenderer): void {
  const key = renderer.indexUri.toString();
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  renderers.push(renderer);
}

function toCustomViewerError(error: unknown): CustomViewerError {
  if (error instanceof CustomViewerError) {
    return error;
  }

  if (error instanceof Error) {
    return new CustomViewerError("RendererPathInvalid", error.message);
  }

  return new CustomViewerError("RendererPathInvalid", String(error));
}