// Trace: FR-028, FR-029, FR-030, AC-010, AC-011, AC-012
import { readFile } from "fs/promises";
import * as path from "path";

import { JSDOM } from "jsdom";

interface HostOverrides {
  openLink?(href: string): void | Promise<void>;
  resolveImage?(href: string): string | null | Promise<string | null>;
}

export async function loadRendererDom(
  rendererDirectory: string,
  payload: unknown,
  hostOverrides: HostOverrides = {}
): Promise<JSDOM> {
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

  const openLinkCalls: string[] = [];
  const resolveImageCalls: string[] = [];

  (dom.window as unknown as { customViewerPayload: unknown }).customViewerPayload = payload;
  (dom.window as unknown as {
    __customViewerHostState: { openLinkCalls: string[]; resolveImageCalls: string[] };
  }).__customViewerHostState = {
    openLinkCalls,
    resolveImageCalls
  };
  (dom.window as unknown as {
    CustomViewerHost: {
      getPayload(): unknown;
      postLog(level: string, message: string): void;
      openLink(href: string): Promise<void>;
      resolveImage(href: string): Promise<string | null>;
    };
  }).CustomViewerHost = {
    getPayload() {
      return payload;
    },
    postLog() {
      // no-op for tests
    },
    async openLink(href: string) {
      openLinkCalls.push(String(href));
      await hostOverrides.openLink?.(String(href));
    },
    async resolveImage(href: string) {
      resolveImageCalls.push(String(href));
      if (hostOverrides.resolveImage) {
        return hostOverrides.resolveImage(String(href));
      }

      return null;
    }
  };

  dom.window.eval(script);
  await flushRendererTasks(dom);
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

export async function flushRendererTasks(dom: JSDOM): Promise<void> {
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
}