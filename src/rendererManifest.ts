// Trace: FR-008, FR-009, FR-010, FR-011, FR-021, AC-008
import * as path from "path";
import * as vscode from "vscode";

import { CustomViewerError } from "./errors";

export interface RendererManifest {
  contractVersion: number;
  id: string;
  displayName: string;
  description?: string;
  supportedExtensions?: string[];
}

export interface ResolvedRenderer {
  extension: string;
  id: string;
  displayName: string;
  source: "explicit" | "root";
  rootUri: vscode.Uri;
  indexUri: vscode.Uri;
  manifestUri?: vscode.Uri;
  manifest?: RendererManifest;
}

export interface FileSystemLike {
  stat(uri: vscode.Uri): Thenable<vscode.FileStat>;
  readFile(uri: vscode.Uri): Thenable<Uint8Array>;
  readDirectory(uri: vscode.Uri): Thenable<[string, vscode.FileType][]>;
}

export async function loadRendererDefinition(args: {
  fs: FileSystemLike;
  extension: string;
  source: "explicit" | "root";
  rootUri: vscode.Uri;
  fallbackId: string;
  fallbackDisplayName?: string;
}): Promise<ResolvedRenderer> {
  try {
    await args.fs.stat(args.rootUri);
  } catch {
    throw new CustomViewerError(
      "RendererPathInvalid",
      `Renderer path is not valid in the current execution environment: ${args.rootUri.toString()}`,
      { id: args.fallbackId, path: args.rootUri.toString() }
    );
  }

  const indexUri = vscode.Uri.joinPath(args.rootUri, "index.html");
  try {
    await args.fs.stat(indexUri);
  } catch {
    throw new CustomViewerError(
      "RendererIndexMissing",
      `Renderer '${args.fallbackId}' was not opened because index.html is missing: ${indexUri.toString()}`,
      { id: args.fallbackId, path: indexUri.toString() }
    );
  }

  const manifestUri = vscode.Uri.joinPath(args.rootUri, "renderer.json");
  const manifest = await tryReadManifest(args.fs, manifestUri, args.fallbackId);

  const displayName = args.fallbackDisplayName
    ?? manifest?.displayName
    ?? args.fallbackId
    ?? path.posix.basename(args.rootUri.path);
  const id = args.fallbackId || manifest?.id || path.posix.basename(args.rootUri.path);

  return {
    extension: args.extension,
    id,
    displayName,
    source: args.source,
    rootUri: args.rootUri,
    indexUri,
    manifestUri: manifest ? manifestUri : undefined,
    manifest
  };
}

async function tryReadManifest(
  fs: FileSystemLike,
  manifestUri: vscode.Uri,
  fallbackId: string
): Promise<RendererManifest | undefined> {
  let rawBytes: Uint8Array;
  try {
    rawBytes = await fs.readFile(manifestUri);
  } catch {
    return undefined;
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(rawBytes)) as Record<string, unknown>;
    return validateManifest(parsed, manifestUri, fallbackId);
  } catch (error) {
    if (error instanceof CustomViewerError) {
      throw error;
    }

    throw new CustomViewerError(
      "RendererManifestInvalid",
      `Renderer manifest is invalid for '${fallbackId}': ${manifestUri.toString()}`,
      { id: fallbackId, path: manifestUri.toString(), reason: String(error) }
    );
  }
}

function validateManifest(
  candidate: Record<string, unknown>,
  manifestUri: vscode.Uri,
  fallbackId: string
): RendererManifest {
  if (typeof candidate.contractVersion !== "number") {
    throw new CustomViewerError(
      "RendererManifestInvalid",
      `Renderer manifest is invalid for '${fallbackId}': contractVersion must be a number (${manifestUri.toString()})`,
      { id: fallbackId, path: manifestUri.toString() }
    );
  }

  if (typeof candidate.id !== "string") {
    throw new CustomViewerError(
      "RendererManifestInvalid",
      `Renderer manifest is invalid for '${fallbackId}': id must be a string (${manifestUri.toString()})`,
      { id: fallbackId, path: manifestUri.toString() }
    );
  }

  if (typeof candidate.displayName !== "string") {
    throw new CustomViewerError(
      "RendererManifestInvalid",
      `Renderer manifest is invalid for '${fallbackId}': displayName must be a string (${manifestUri.toString()})`,
      { id: fallbackId, path: manifestUri.toString() }
    );
  }

  if (candidate.supportedExtensions !== undefined && !Array.isArray(candidate.supportedExtensions)) {
    throw new CustomViewerError(
      "RendererManifestInvalid",
      `Renderer manifest is invalid for '${fallbackId}': supportedExtensions must be an array (${manifestUri.toString()})`,
      { id: fallbackId, path: manifestUri.toString() }
    );
  }

  return {
    contractVersion: candidate.contractVersion,
    id: candidate.id,
    displayName: candidate.displayName,
    description: typeof candidate.description === "string" ? candidate.description : undefined,
    supportedExtensions: Array.isArray(candidate.supportedExtensions)
      ? candidate.supportedExtensions.filter((entry): entry is string => typeof entry === "string")
      : undefined
  };
}