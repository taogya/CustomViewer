// Trace: FR-028, AC-010, AC-014
import * as assert from "assert";
import * as path from "path";

import { dispatchRendererUpdate, loadRendererDom } from "./helpers/domHarness";

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

    assert.strictEqual(dom.window.document.getElementById("result-summary")?.textContent, "1 section(s)");
    assert.match(dom.window.document.getElementById("sections")?.innerHTML ?? "", /<mark>Renderer<\/mark>/i);
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

    assert.strictEqual(dom.window.document.getElementById("document-title")?.textContent, "new.md");
    assert.match(dom.window.document.getElementById("sections")?.textContent ?? "", /Updated/);
  });
});