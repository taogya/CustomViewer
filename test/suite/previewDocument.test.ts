// Trace: FR-011, FR-025, AC-014
import * as assert from "assert";
import * as vscode from "vscode";

import { buildPreviewDocument } from "../../src/previewDocument";

suite("previewDocument", () => {
  test("injects CSP, bridge, and rewrites relative resources", () => {
    const output = buildPreviewDocument({
      rawHtml: "<!DOCTYPE html><html><head><link rel=\"stylesheet\" href=\"./styles.css\"><script src=\"./app.js\"></script></head><body><img src=\"./image.png\"></body></html>",
      rendererRootUri: vscode.Uri.file("/tmp/renderer"),
      mediaRootUri: vscode.Uri.file("/tmp/media"),
      webview: {
        cspSource: "vscode-webview://test-csp",
        asWebviewUri(uri) {
          return vscode.Uri.parse(`vscode-webview://test${uri.path}`);
        }
      }
    });

    assert.match(output, /Content-Security-Policy/);
    assert.match(output, /hostBridge\.js/);
    assert.match(output, /vscode-webview:\/\/test\/tmp\/renderer\/styles\.css/);
    assert.match(output, /vscode-webview:\/\/test\/tmp\/renderer\/app\.js/);
    assert.match(output, /vscode-webview:\/\/test\/tmp\/renderer\/image\.png/);
  });
});