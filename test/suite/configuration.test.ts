// Trace: FR-001, FR-002, FR-003, FR-006, FR-022, FR-023, AC-001, AC-002, AC-009, AC-014
import * as assert from "assert";
import * as vscode from "vscode";

import { buildEffectiveConfiguration, normalizeExtension, resolveConfiguredPath } from "../../src/configuration";

suite("configuration", () => {
  test("uses workspace precedence when trusted", () => {
    const config = buildEffectiveConfiguration({
      extensionRendererMapInspect: {
        globalValue: { md: [{ id: "global", path: "/global/md" }] },
        workspaceValue: { md: [{ id: "workspace", path: "/workspace/md" }] }
      },
      rendererRootsInspect: {
        globalValue: ["/global/root"],
        workspaceValue: ["/workspace/root"]
      },
      isTrusted: true
    });

    assert.deepStrictEqual(config.extensionRendererMap.md[0], { id: "workspace", path: "/workspace/md" });
    assert.deepStrictEqual(config.rendererRoots, ["/workspace/root"]);
  });

  test("uses only user settings when untrusted", () => {
    const config = buildEffectiveConfiguration({
      extensionRendererMapInspect: {
        globalValue: { json: [{ id: "user", path: "/user/json" }] },
        workspaceValue: { json: [{ id: "workspace", path: "/workspace/json" }] }
      },
      rendererRootsInspect: {
        globalValue: ["/user/root"],
        workspaceValue: ["/workspace/root"]
      },
      isTrusted: false
    });

    assert.deepStrictEqual(config.extensionRendererMap.json[0], { id: "user", path: "/user/json" });
    assert.deepStrictEqual(config.rendererRoots, ["/user/root"]);
  });

  test("normalizes dotted extensions", () => {
    assert.strictEqual(normalizeExtension(".MD"), "md");
    assert.strictEqual(normalizeExtension("json"), "json");
  });

  test("resolves workspaceFolder paths", () => {
    const workspaceFolder = { name: "repo", index: 0, uri: vscode.Uri.file("/tmp/repo") } as vscode.WorkspaceFolder;
    const result = resolveConfiguredPath("${workspaceFolder}/examples/renderers", {
      workspaceFolders: [workspaceFolder]
    });

    assert.ok(result.uri);
    assert.strictEqual(result.uri?.fsPath, "/tmp/repo/examples/renderers");
  });

  test("rejects unsupported relative paths", () => {
    const result = resolveConfiguredPath("examples/renderers", {});
    assert.ok(result.error);
    assert.strictEqual(result.error?.code, "RendererPathInvalid");
  });
});