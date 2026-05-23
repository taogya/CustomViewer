# Build Your Own Renderer

[日本語](./ja/renderer-authoring.md) · [Back to README](../../README.md)

A "renderer" is just a folder containing an `index.html`. CustomViewer loads that HTML in a sandboxed panel and tells it which file the user opened.

If you've written a static web page, you can build a renderer.

## Minimum layout

```text
my-renderer/
  index.html
  app.js          # optional
  styles.css      # optional
  renderer.json   # optional metadata
```

The only required file is `index.html`. Reference local assets with relative paths:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="./styles.css">
    <script src="./app.js" defer></script>
  </head>
  <body>
    <main id="app"></main>
  </body>
</html>
```

## Receiving the file content

CustomViewer injects a small helper into your page. To receive the opened file:

```js
window.addEventListener("custom-viewer:update", (event) => {
  const { payload } = event.detail;
  const app = document.getElementById("app");
  app.textContent = payload.savedTextContent ?? "No file opened.";
});
```

The `payload` object contains:

| Field | Description |
| --- | --- |
| `savedTextContent` | The saved text of the opened file (`null` when launched standalone). |
| `fileName` | File name, e.g. `"handbook.md"`. |
| `sourceUri` | Full URI of the opened file. |
| `normalizedExtension` | Lower-cased extension, e.g. `"md"`. |
| `launchMode` | `"file"` or `"standalone"`. |
| `renderer.id`, `renderer.displayName` | Identity of this renderer. |
| `workspaceTrust.isTrusted` | Whether the workspace is trusted. |

You can also call `window.CustomViewerHost.getPayload()` at any time to get the latest payload, or `window.CustomViewerHost.postLog("info", "...")` to write to the VS Code output log.

## Optional `renderer.json`

Add a `renderer.json` next to `index.html` if you want a friendly name in the picker:

```json
{
  "contractVersion": 1,
  "id": "docs-navigator",
  "displayName": "Docs Navigator",
  "description": "Markdown preview with heading navigation.",
  "supportedExtensions": ["md"]
}
```

All fields except `contractVersion` are optional.

## Sandbox rules

For safety, CustomViewer enforces a strict Content Security Policy on every renderer:

- **Allowed**: assets bundled inside your renderer folder (CSS, JS, images, fonts).
- **Blocked**: inline `<script>` and `<style>`, external CDNs, network requests, VS Code APIs, file system access.

If you need a library, ship it inside the renderer folder.

## Examples to copy from

The repository includes three working renderers under [`examples/renderers/by-extension/`](../../examples/renderers/by-extension):

- `md/docs-navigator/` — Markdown with heading navigation and text search.
- `json/rich-inspector/` — JSON card view with filtering.
- `c/function-browser/` — C function index with collapsible code sections.

## See also

- [AI Prompt for Renderers](./ai-prompt.md) — have an AI assistant write the renderer for you
- [Configuration](./configuration.md)
- [Troubleshooting](./troubleshooting.md)
