// Trace: FR-028, FR-032, AC-010, AC-014, AC-015, AC-016
import * as assert from "assert";
import * as path from "path";

import { dispatchRendererUpdate, flushRendererTasks, loadRendererDom } from "./helpers/domHarness";

suite("examples markdown renderer", () => {
  test("shows navigation and filters sections by search", async () => {
    const rendererDir = path.resolve(__dirname, "../../../examples/renderers/by-extension/md/docs-navigator");
    const dom = await loadRendererDom(rendererDir, {
      fileName: "handbook.md",
      savedTextContent: "# Alpha\n\n## Renderer Search\nrenderer search navigation\n\n## Beta\nplain text"
    });

    const nav = dom.window.document.querySelectorAll(".nav-link");
    assert.strictEqual(nav.length, 3);

    const search = dom.window.document.getElementById("search") as HTMLInputElement;
    search.value = "renderer";
    search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    await flushRendererTasks(dom);

    assert.strictEqual(dom.window.document.getElementById("result-summary")?.textContent, "1 section(s)");
    assert.match(dom.window.document.getElementById("sections")?.innerHTML ?? "", /<mark>Renderer<\/mark>/i);
  });

  test("renders markdown links and resolves relative images through the host bridge", async () => {
    const rendererDir = path.resolve(__dirname, "../../../examples/renderers/by-extension/md/docs-navigator");
    const dom = await loadRendererDom(
      rendererDir,
      {
        fileName: "formatting.md",
        savedTextContent: "# Formatting\n\nSee [jump](#formatting), [external docs](https://example.test/docs), [workspace guide](./guide.md), and ![Overview image](./overview.png)."
      },
      {
        resolveImage: async href => href === "./overview.png" ? "vscode-resource:/overview.png" : null
      }
    );

    const sections = dom.window.document.getElementById("sections");
    const hostState = (dom.window as unknown as {
      __customViewerHostState: { openLinkCalls: string[]; resolveImageCalls: string[] };
    }).__customViewerHostState;

    assert.strictEqual(sections?.querySelector('a.md-link[href="#formatting"]')?.getAttribute("data-anchor-target"), "formatting");
    assert.strictEqual(sections?.querySelector('a.md-link[href="https://example.test/docs"]')?.getAttribute("target"), "_blank");
    assert.strictEqual(sections?.querySelector('a.md-link[data-relative-href]')?.getAttribute("data-relative-href"), "./guide.md");
    assert.deepStrictEqual(hostState.resolveImageCalls, ["./overview.png"]);
    assert.strictEqual(sections?.querySelector("img")?.getAttribute("src"), "vscode-resource:/overview.png");

    sections?.querySelector('a.md-link[data-relative-href]')?.dispatchEvent(new dom.window.MouseEvent("click", {
      bubbles: true,
      cancelable: true
    }));

    assert.deepStrictEqual(hostState.openLinkCalls, ["./guide.md"]);
    assert.ok(!sections?.textContent?.includes("[workspace guide](./guide.md)"));
  });

  test("rerenders when host dispatches a payload update", async () => {
    const rendererDir = path.resolve(__dirname, "../../../examples/renderers/by-extension/md/docs-navigator");
    const dom = await loadRendererDom(rendererDir, {
      fileName: "old.md",
      savedTextContent: "# Old\n\n## Section\ntext"
    });

    dispatchRendererUpdate(dom, {
      fileName: "new.md",
      savedTextContent: "# New\n\n## Updated\ntext"
    });
    await flushRendererTasks(dom);

    assert.strictEqual(dom.window.document.getElementById("document-title")?.textContent, "new.md");
    assert.match(dom.window.document.getElementById("sections")?.textContent ?? "", /Updated/);
  });
});