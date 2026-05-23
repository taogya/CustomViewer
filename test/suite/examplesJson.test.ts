// Trace: FR-029, AC-011, AC-014
import * as assert from "assert";
import * as path from "path";

import { loadRendererDom } from "./helpers/domHarness";

suite("examples json renderer", () => {
  test("supports element filtering and search", async () => {
    const rendererDir = path.resolve(__dirname, "../../../examples/renderers/by-extension/json/rich-inspector");
    const dom = await loadRendererDom(rendererDir, {
      fileName: "catalog.json",
      savedTextContent: JSON.stringify({
        items: [
          { id: "1", type: "document", status: "active", title: "Architecture", owner: "platform", tags: ["renderer"], priority: 1, summary: "Renderer architecture" },
          { id: "2", type: "config", status: "draft", title: "Workspace Settings", owner: "tooling", tags: ["preview"], priority: 2, summary: "Settings example" }
        ]
      })
    });

    const filter = dom.window.document.getElementById("filter") as HTMLSelectElement;
    filter.value = "config";
    filter.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

    assert.strictEqual(dom.window.document.getElementById("summary")?.textContent, "1 of 2 item(s)");
    assert.match(dom.window.document.getElementById("cards")?.textContent ?? "", /Workspace Settings/);

    const search = dom.window.document.getElementById("search") as HTMLInputElement;
    search.value = "settings";
    search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    assert.match(dom.window.document.getElementById("cards")?.innerHTML ?? "", /<mark>Settings<\/mark>/i);
  });
});