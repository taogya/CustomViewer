// Trace: FR-028, FR-029, FR-030, AC-010, AC-011, AC-012
import { readFile } from "fs/promises";
import * as path from "path";

import { JSDOM } from "jsdom";

export async function loadRendererDom(rendererDirectory: string, payload: unknown): Promise<JSDOM> {
  const [html, script] = await Promise.all([
    readFile(path.join(rendererDirectory, "index.html"), "utf8"),
    readFile(path.join(rendererDirectory, "app.js"), "utf8")
  ]);

  const dom = new JSDOM(html, {
    url: "https://example.test/",
    runScripts: "dangerously"
  });

  Object.defineProperty(dom.window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value() {
      // jsdom does not implement layout.
    }
  });

  (dom.window as unknown as { customViewerPayload: unknown }).customViewerPayload = payload;
  dom.window.eval(script);
  return dom;
}

export function dispatchRendererUpdate(dom: JSDOM, payload: unknown): void {
  dom.window.dispatchEvent(new dom.window.CustomEvent("custom-viewer:update", {
    detail: {
      messageType: "rerender",
      payload
    }
  }));
}