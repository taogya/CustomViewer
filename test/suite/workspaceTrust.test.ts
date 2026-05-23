// Trace: FR-022, FR-023, AC-006, AC-007, AC-014
import * as assert from "assert";
import * as vscode from "vscode";

import { filterRenderersForTrust } from "../../src/trustPolicy";
import type { ResolvedRenderer } from "../../src/rendererManifest";

suite("workspaceTrust", () => {
  test("blocks workspace-local renderers in restricted mode", () => {
    const workspaceFolder = { name: "repo", index: 0, uri: vscode.Uri.file("/tmp/repo") } as vscode.WorkspaceFolder;
    const renderers: ResolvedRenderer[] = [
      createRenderer("workspace", vscode.Uri.file("/tmp/repo/examples/renderers/md")),
      createRenderer("external", vscode.Uri.file("/opt/renderers/md"))
    ];

    const result = filterRenderersForTrust({
      renderers,
      issues: [],
      isTrusted: false,
      workspaceFolders: [workspaceFolder]
    });

    assert.strictEqual(result.renderers.length, 1);
    assert.strictEqual(result.renderers[0].id, "external");
    assert.strictEqual(result.issues[0]?.code, "RendererBlockedByTrust");
  });
});

function createRenderer(id: string, rootUri: vscode.Uri): ResolvedRenderer {
  return {
    extension: "md",
    id,
    displayName: id,
    source: "explicit",
    rootUri,
    indexUri: vscode.Uri.joinPath(rootUri, "index.html")
  };
}