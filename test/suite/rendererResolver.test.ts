// Trace: FR-005, FR-008, FR-009, FR-010, FR-011, FR-020, FR-021, AC-001, AC-002, AC-003, AC-008, AC-014
import * as assert from "assert";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

import { resolveAllRenderers, resolveRenderersForExtension } from "../../src/rendererResolver";
import type { FileSystemLike } from "../../src/rendererManifest";

const nodeFs: FileSystemLike = {
  async stat(uri) {
    const info = await stat(uri.fsPath);
    return {
      type: info.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File,
      ctime: info.ctimeMs,
      mtime: info.mtimeMs,
      size: info.size
    };
  },
  async readFile(uri) {
    return readFile(uri.fsPath);
  },
  async readDirectory(uri) {
    const entries = await readdir(uri.fsPath, { withFileTypes: true });
    return entries.map(entry => {
      const type = entry.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File;
      return [entry.name, type] as [string, vscode.FileType];
    });
  }
};

suite("rendererResolver", () => {
  let tempRoot = "";

  setup(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "customviewer-renderers-"));
  });

  teardown(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("keeps explicit mapping before convention results", async () => {
    const explicitRoot = path.join(tempRoot, "explicit-md");
    const conventionRoot = path.join(tempRoot, "roots", "by-extension", "md", "docs");
    await writeRenderer(explicitRoot, "explicit-md", "Explicit Markdown");
    await writeRenderer(conventionRoot, "docs", "Convention Markdown");

    const result = await resolveRenderersForExtension({
      extension: "md",
      configuration: {
        extensionRendererMap: {
          md: [{ id: "explicit-md", path: explicitRoot, displayName: "Explicit Markdown" }]
        },
        rendererRoots: [path.join(tempRoot, "roots")]
      },
      isTrusted: true,
      fs: nodeFs
    });

    assert.strictEqual(result.renderers.length, 2);
    assert.strictEqual(result.renderers[0].id, "explicit-md");
    assert.strictEqual(result.renderers[1].id, "docs");
  });

  test("reports missing index.html as an issue", async () => {
    const brokenRoot = path.join(tempRoot, "broken");
    await mkdir(brokenRoot, { recursive: true });

    const result = await resolveRenderersForExtension({
      extension: "json",
      configuration: {
        extensionRendererMap: {
          json: [{ id: "broken", path: brokenRoot }]
        },
        rendererRoots: []
      },
      isTrusted: true,
      fs: nodeFs
    });

    assert.strictEqual(result.renderers.length, 0);
    assert.strictEqual(result.issues[0]?.code, "RendererIndexMissing");
  });

  test("resolveAllRenderers scans convention roots", async () => {
    const mdRenderer = path.join(tempRoot, "roots", "by-extension", "md", "docs");
    const jsonRenderer = path.join(tempRoot, "roots", "by-extension", "json", "inspector");
    await writeRenderer(mdRenderer, "docs", "Docs");
    await writeRenderer(jsonRenderer, "inspector", "Inspector");

    const result = await resolveAllRenderers({
      configuration: {
        extensionRendererMap: {},
        rendererRoots: [path.join(tempRoot, "roots")]
      },
      isTrusted: true,
      fs: nodeFs
    });

    assert.strictEqual(result.renderers.length, 2);
    assert.deepStrictEqual(result.renderers.map(renderer => renderer.extension).sort(), ["json", "md"]);
  });
});

async function writeRenderer(directory: string, id: string, displayName: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), "<!DOCTYPE html><html><head></head><body>sample</body></html>");
  await writeFile(path.join(directory, "renderer.json"), JSON.stringify({
    contractVersion: 1,
    id,
    displayName
  }, null, 2));
}