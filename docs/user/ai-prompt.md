# AI Prompt: Build a CustomViewer renderer

[日本語](./ja/ai-prompt.md) · [Back to README](../../README.md)

Use the prompt below with your AI coding assistant (Copilot Chat, Cursor, Claude, ChatGPT, etc.) to generate a CustomViewer renderer for you.

Before sending it, edit only the Settings section below.

---

## Prompt template

````
You are building a "renderer" for the VS Code extension **CustomViewer**.

A renderer is a folder containing an `index.html` (plus any local CSS/JS/asset
files it needs). CustomViewer loads that HTML inside a sandboxed WebView and
delivers the opened file's content as a JSON payload.

Before sending this prompt, edit only the Settings section below. Leave the rest of the prompt unchanged unless you have a specific reason to modify it.
If there are multiple settings, create a renderer that scales with the number of settings.

# Settings
Treat this section as the single source of truth. Copy these values exactly into the folder name, `renderer.json`, `<title>`, and description.

```yaml
targetExtension: md
rendererId: my-renderer
displayName: My Renderer
description: One-sentence description
outputRoot: tmp
uiRequirements: |
  Describe the UI. Example: Show the Markdown rendered to HTML, with a
  collapsible table of contents on the left built from the headings.
```

Please generate the renderer described below.

# What I want
- Use `targetExtension` as the target file extension.
- Use `rendererId` as the renderer id (folder name, kebab-case).
- Use `displayName` as the display name.
- Use `description` as the one-sentence renderer description.
- Use `uiRequirements` as the UI / behavior requirements.

# Output
Create the renderer in this folder:

`<outputRoot>/by-extension/<targetExtension>/<rendererId>/`

Generate these files:
1. `index.html`
2. `app.js`
3. `styles.css`
4. `renderer.json`

# Hard rules (CustomViewer sandbox)
The WebView enforces a strict Content Security Policy. The generated code
MUST obey all of these:
- No inline `<script>` and no inline `<style>` (use external `./app.js`
  and `./styles.css` only).
- No external CDNs, no `<link>` / `<script>` / `<img>` / `@font-face`
  pointing at a remote URL. Everything must be local files inside the
  renderer folder.
- No `fetch` / `XMLHttpRequest` / WebSocket / network calls.
- No usage of any `vscode` API or Node.js API. Only standard browser DOM.
- Only reference renderer-owned files with renderer-folder-relative paths,
  e.g. `./styles.css`, `./app.js`, `./logo.png`.
- For relative links or relative image paths that come from
  `payload.savedTextContent`, do not resolve them against the renderer folder.
  Use `window.CustomViewerHost.openLink()` and
  `window.CustomViewerHost.resolveImage()` instead.

# Runtime contract you must use
CustomViewer injects a helper before your script runs. Use it like this:

```js
window.addEventListener("custom-viewer:update", (event) => {
  const { payload } = event.detail;
  render(payload);
});

function render(payload) {
  // payload.savedTextContent : string | null   (the saved file contents)
  // payload.fileName         : string | null
  // payload.sourceUri        : string | null
  // payload.normalizedExtension : string | null  (lower-cased, e.g. "md")
  // payload.launchMode       : "file" | "standalone"
  // payload.renderer         : { id: string, displayName: string }
  // payload.workspaceTrust   : { isTrusted: boolean }
  // ...
}
```

When `launchMode === "standalone"` or `savedTextContent === null`, show a
friendly empty state instead of crashing.

You may also use these helpers when needed:

- `window.CustomViewerHost.getPayload()` : get the latest payload.
- `window.CustomViewerHost.postLog(level, message)` : write to the VS Code output log.
- `window.CustomViewerHost.openLink(href)` : use this for clicks on source-document-relative links or external URLs generated from `payload.savedTextContent`. Do not rely on raw relative `<a href>` navigation for those links.
- `window.CustomViewerHost.resolveImage(href)` : use this for source-document-relative image paths generated from `payload.savedTextContent`. `await` it and assign the returned URL to `img.src`.

For a Markdown-to-HTML renderer, follow at least this pattern:

```js
document.addEventListener("click", (event) => {
  const anchor = event.target.closest("a[data-source-href]");
  if (!anchor) {
    return;
  }

  event.preventDefault();
  window.CustomViewerHost.openLink(anchor.dataset.sourceHref || "");
});

const resolvedImageUrl = await window.CustomViewerHost.resolveImage("./images/overview.png");
if (resolvedImageUrl) {
  image.src = resolvedImageUrl;
}
```

# renderer.json
Generate `renderer.json` with values filled from the Settings section:
```json
{
  "contractVersion": 1,
  "id": "<rendererId>",
  "displayName": "<displayName>",
  "description": "<description>",
  "supportedExtensions": ["<targetExtension>"]
}
```

# index.html skeleton
Start from this structure and fill in the body:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title><displayName></title>
    <link rel="stylesheet" href="./styles.css">
    <script src="./app.js" defer></script>
  </head>
  <body>
    <main id="app"></main>
  </body>
</html>
```

````

---

## Tips

- Need a library (e.g. a Markdown parser)? Ask the assistant to **vendor** the library file into the renderer folder and reference it with a relative `<script src="./lib.js">`. CDN links will be blocked.
- This template defaults to `<outputRoot>/by-extension/<extension>/<renderer-id>/` so the result can be discovered directly by `customViewer.rendererRoots`. If you plan to register the folder explicitly in `extensionRendererMap`, you can change only the output location.
- After the assistant generates the files, drop the folder somewhere on disk and add it to your settings — see [Configuration](./configuration.md).
- If the preview shows a blank panel, open VS Code's DevTools for the WebView (`Developer: Open Webview Developer Tools`) and look for CSP violations.

## See also

- [Build Your Own Renderer](./renderer-authoring.md) — the full contract reference.
- [Configuration](./configuration.md) — how to register the generated folder.
- [Troubleshooting](./troubleshooting.md) — common errors.
