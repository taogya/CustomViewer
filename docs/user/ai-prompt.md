# AI Prompt: Build a CustomViewer renderer

[日本語](./ja/ai-prompt.md) · [Back to README](../../README.md)

Use the prompt below with your AI coding assistant (Copilot Chat, Cursor, Claude, ChatGPT, etc.) to generate a CustomViewer renderer for you.

Replace the **`{{...}}`** placeholders with your own values before sending.

---

## Prompt template

````
You are building a "renderer" for the VS Code extension **CustomViewer**.

A renderer is a folder containing an `index.html` (plus any local CSS/JS/asset
files it needs). CustomViewer loads that HTML inside a sandboxed WebView and
delivers the opened file's content as a JSON payload.

Please generate the renderer described below.

# What I want
- Target file extension: `{{md}}`
- Renderer id (folder name, kebab-case): `{{my-renderer}}`
- Display name: `{{My Renderer}}`
- What the preview should look like / do:
  {{Describe the UI. Example: "Show the Markdown rendered to HTML, with a
  collapsible table of contents on the left built from the headings."}}

# Output
Produce these files inside a folder named `{{my-renderer}}/`:
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
- Reference local files with relative paths, e.g. `./styles.css`,
  `./logo.png`.

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

# renderer.json
Generate `renderer.json` with:
```json
{
  "contractVersion": 1,
  "id": "{{my-renderer}}",
  "displayName": "{{My Renderer}}",
  "description": "{{One-sentence description.}}",
  "supportedExtensions": ["{{md}}"]
}
```

# index.html skeleton
Start from this structure and fill in the body:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>{{My Renderer}}</title>
    <link rel="stylesheet" href="./styles.css">
    <script src="./app.js" defer></script>
  </head>
  <body>
    <main id="app"></main>
  </body>
</html>
```

# Deliverable
Return the four files in full, each in its own fenced code block labeled
with its filename. Do not add any other files.
````

---

## Tips

- Need a library (e.g. a Markdown parser)? Ask the assistant to **vendor** the library file into the renderer folder and reference it with a relative `<script src="./lib.js">`. CDN links will be blocked.
- After the assistant generates the files, drop the folder somewhere on disk and add it to your settings — see [Configuration](./configuration.md).
- If the preview shows a blank panel, open VS Code's DevTools for the WebView (`Developer: Open Webview Developer Tools`) and look for CSP violations.

## See also

- [Build Your Own Renderer](./renderer-authoring.md) — the full contract reference.
- [Configuration](./configuration.md) — how to register the generated folder.
- [Troubleshooting](./troubleshooting.md) — common errors.
