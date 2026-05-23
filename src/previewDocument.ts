// Trace: FR-008, FR-011, FR-025
import * as vscode from "vscode";

export interface WebviewLike {
  cspSource: string;
  asWebviewUri(uri: vscode.Uri): vscode.Uri;
}

export interface BuildPreviewDocumentOptions {
  rawHtml: string;
  rendererRootUri: vscode.Uri;
  mediaRootUri: vscode.Uri;
  webview: WebviewLike;
}

export function buildPreviewDocument(options: BuildPreviewDocumentOptions): string {
  const csp = buildCsp(options.webview.cspSource);
  const rewritten = rewriteRelativeResourceUris(options.rawHtml, options.rendererRootUri, options.webview);
  const withCsp = replaceOrInjectCsp(rewritten, csp);
  const bridgeUri = options.webview.asWebviewUri(vscode.Uri.joinPath(options.mediaRootUri, "hostBridge.js")).toString();
  return injectBridgeScript(withCsp, bridgeUri);
}

export function buildCsp(cspSource: string): string {
  return [
    "default-src 'none'",
    `img-src ${cspSource} data:`,
    `style-src ${cspSource}`,
    `script-src ${cspSource}`,
    `font-src ${cspSource}`,
    "connect-src 'none'"
  ].join("; ");
}

function rewriteRelativeResourceUris(rawHtml: string, rendererRootUri: vscode.Uri, webview: WebviewLike): string {
  return rawHtml.replace(/\b(src|href)=(['"])([^'"]+)\2/gi, (_match, attr, quote, value: string) => {
    if (!shouldRewriteResource(value)) {
      return `${attr}=${quote}${value}${quote}`;
    }

    const [, resourcePath, suffix = ""] = value.match(/^([^?#]*)(.*)$/) ?? [value, value, ""];
    const segments = resourcePath.split(/[\\/]+/).filter(Boolean);
    const resourceUri = vscode.Uri.joinPath(rendererRootUri, ...segments);
    const webviewUri = webview.asWebviewUri(resourceUri).toString();
    return `${attr}=${quote}${webviewUri}${suffix}${quote}`;
  });
}

function shouldRewriteResource(value: string): boolean {
  if (!value || value.startsWith("#") || value.startsWith("data:") || value.startsWith("mailto:")) {
    return false;
  }

  return !/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith("//");
}

function replaceOrInjectCsp(rawHtml: string, csp: string): string {
  const metaTag = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  if (/<meta\s+http-equiv=['"]Content-Security-Policy['"]/i.test(rawHtml)) {
    return rawHtml.replace(/<meta\s+http-equiv=['"]Content-Security-Policy['"][^>]*>/i, metaTag);
  }

  return rawHtml.replace(/<head([^>]*)>/i, `<head$1>\n  ${metaTag}`);
}

function injectBridgeScript(rawHtml: string, bridgeUri: string): string {
  if (rawHtml.includes("data-customviewer-bridge")) {
    return rawHtml;
  }

  const scriptTag = `<script src="${bridgeUri}" data-customviewer-bridge="true"></script>`;
  return rawHtml.replace(/<head([^>]*)>/i, `<head$1>\n  ${scriptTag}`);
}