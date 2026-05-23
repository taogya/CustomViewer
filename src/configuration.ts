// Trace: FR-001, FR-002, FR-003, FR-006, FR-022, FR-023, AC-001, AC-002, AC-009
import * as path from "path";
import * as vscode from "vscode";

import { CustomViewerError } from "./errors";

export interface RendererMappingEntry {
  id: string;
  path: string;
  displayName?: string;
}

export interface EffectiveConfiguration {
  extensionRendererMap: Record<string, RendererMappingEntry[]>;
  rendererRoots: string[];
}

export interface ConfigurationInspectLike<T> {
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
}

export interface PathResolutionOptions {
  resource?: vscode.Uri;
  workspaceFolders?: readonly vscode.WorkspaceFolder[];
}

export function normalizeExtension(value: string): string {
  return value.trim().replace(/^\.+/, "").toLowerCase();
}

export function buildEffectiveConfiguration(args: {
  extensionRendererMapInspect?: ConfigurationInspectLike<unknown>;
  rendererRootsInspect?: ConfigurationInspectLike<unknown>;
  isTrusted: boolean;
}): EffectiveConfiguration {
  const mapValue = args.isTrusted
    ? args.extensionRendererMapInspect?.workspaceFolderValue
      ?? args.extensionRendererMapInspect?.workspaceValue
      ?? args.extensionRendererMapInspect?.globalValue
      ?? {}
    : args.extensionRendererMapInspect?.globalValue ?? {};

  const rootsValue = args.isTrusted
    ? args.rendererRootsInspect?.workspaceFolderValue
      ?? args.rendererRootsInspect?.workspaceValue
      ?? args.rendererRootsInspect?.globalValue
      ?? []
    : args.rendererRootsInspect?.globalValue ?? [];

  return {
    extensionRendererMap: coerceExtensionRendererMap(mapValue),
    rendererRoots: coerceRendererRoots(rootsValue)
  };
}

export function readEffectiveConfiguration(
  resource: vscode.Uri | undefined,
  isTrusted: boolean,
  workspaceApi: typeof vscode.workspace = vscode.workspace
): EffectiveConfiguration {
  const config = workspaceApi.getConfiguration("customViewer", resource);
  return buildEffectiveConfiguration({
    extensionRendererMapInspect: config.inspect("extensionRendererMap"),
    rendererRootsInspect: config.inspect("rendererRoots"),
    isTrusted
  });
}

export function resolveConfiguredPath(
  configuredPath: string,
  options: PathResolutionOptions
): { uri?: vscode.Uri; error?: CustomViewerError } {
  const tokenMatch = configuredPath.match(/^\$\{workspaceFolder(?::([^}]+))?\}(.*)$/);
  if (tokenMatch) {
    const folderName = tokenMatch[1];
    const suffix = tokenMatch[2] ?? "";
    const folder = selectWorkspaceFolder(folderName, options);
    if (!folder) {
      return {
        error: new CustomViewerError(
          "RendererPathInvalid",
          `Renderer path could not resolve ${folderName ? `workspaceFolder:${folderName}` : "workspaceFolder"}: ${configuredPath}`,
          { path: configuredPath, reason: "workspaceFolder could not be resolved" }
        )
      };
    }

    const relativeSegments = suffix.split(/[\\/]+/).filter(Boolean);
    const uri = relativeSegments.length === 0
      ? folder.uri
      : vscode.Uri.joinPath(folder.uri, ...relativeSegments);

    return { uri };
  }

  if (path.isAbsolute(configuredPath)) {
    return { uri: vscode.Uri.file(configuredPath) };
  }

  return {
    error: new CustomViewerError(
      "RendererPathInvalid",
      `Renderer path must be absolute or start with workspaceFolder syntax: ${configuredPath}`.replaceAll("\u007f", "$"),
      { path: configuredPath, reason: "relative paths are not supported" }
    )
  };
}

function coerceExtensionRendererMap(value: unknown): Record<string, RendererMappingEntry[]> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const result: Record<string, RendererMappingEntry[]> = {};
  for (const [rawExtension, rawEntries] of Object.entries(value as Record<string, unknown>)) {
    const extension = normalizeExtension(rawExtension);
    if (!extension || !Array.isArray(rawEntries)) {
      continue;
    }

    const entries = rawEntries.flatMap(entry => coerceRendererMappingEntry(entry));
    if (entries.length > 0) {
      result[extension] = entries;
    }
  }

  return result;
}

function coerceRendererRoots(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function coerceRendererMappingEntry(value: unknown): RendererMappingEntry[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string" || typeof candidate.path !== "string") {
    return [];
  }

  const entry: RendererMappingEntry = {
    id: candidate.id,
    path: candidate.path
  };

  if (typeof candidate.displayName === "string") {
    entry.displayName = candidate.displayName;
  }

  return [entry];
}

function selectWorkspaceFolder(
  folderName: string | undefined,
  options: PathResolutionOptions
): vscode.WorkspaceFolder | undefined {
  const workspaceFolders = options.workspaceFolders ?? [];
  if (folderName) {
    return workspaceFolders.find(folder => folder.name === folderName);
  }

  if (options.resource) {
    const containingFolder = workspaceFolders.find(folder => isUriInsideFolder(options.resource!, folder.uri));
    if (containingFolder) {
      return containingFolder;
    }
  }

  if (workspaceFolders.length === 1) {
    return workspaceFolders[0];
  }

  return undefined;
}

function isUriInsideFolder(resource: vscode.Uri, folderUri: vscode.Uri): boolean {
  if (resource.scheme !== folderUri.scheme || resource.authority !== folderUri.authority) {
    return false;
  }

  const base = folderUri.toString().replace(/\/+$/, "");
  const target = resource.toString();
  return target === base || target.startsWith(`${base}/`);
}