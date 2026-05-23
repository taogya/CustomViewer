// Trace: FR-030, AC-012, AC-014
import * as assert from "assert";
import * as path from "path";

import { dispatchRendererUpdate, loadRendererDom } from "./helpers/domHarness";

suite("examples c renderer", () => {
  test("shows a function list and collapsible code sections", async () => {
    const rendererDir = path.resolve(__dirname, "../../../examples/renderers/by-extension/c/function-browser");
    const dom = await loadRendererDom(rendererDir, {
      fileName: "sample.c",
      savedTextContent: "static int one(void) {\n  return 1;\n}\n\nstatic int two(void) {\n  return 2;\n}\n"
    });

    const buttons = dom.window.document.querySelectorAll(".function-link");
    const details = dom.window.document.querySelectorAll("details");

    assert.strictEqual(buttons.length, 2);
    assert.strictEqual(details.length, 2);
  });

  test("rerenders the function list when payload changes", async () => {
    const rendererDir = path.resolve(__dirname, "../../../examples/renderers/by-extension/c/function-browser");
    const dom = await loadRendererDom(rendererDir, {
      fileName: "sample.c",
      savedTextContent: "static int one(void) {\n  return 1;\n}\n"
    });

    dispatchRendererUpdate(dom, {
      fileName: "sample.c",
      savedTextContent: "static int one(void) {\n  return 1;\n}\n\nstatic int two(void) {\n  return 2;\n}\n"
    });

    assert.strictEqual(dom.window.document.querySelectorAll(".function-link").length, 2);
  });
});