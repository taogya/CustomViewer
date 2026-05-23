# Troubleshooting

[日本語](./ja/troubleshooting.md) · [Back to README](../../README.md)

## "The preview doesn't update"

CustomViewer never refreshes automatically. **Save** the file, then run **CustomViewer: Rerender Preview** (`Cmd/Ctrl+Alt+R`).

## "No preview opens for this file"

Check, in order:

1. The file's extension matches a key in `customViewer.extensionRendererMap` (or one of your `rendererRoots`). Extension matching is case-insensitive: `.MD` and `.md` are the same.
2. The configured `path` exists.
3. Any error notification CustomViewer showed when it tried — see the error codes below.

## Error codes

CustomViewer surfaces problems as notifications with a short code.

| Code | What it means | What to do |
| --- | --- | --- |
| `RendererPathInvalid` | The path is missing, not absolute / `${workspaceFolder}`-based, or lives on the wrong side of a remote session. | Use an absolute or `${workspaceFolder}` path. Make sure the folder actually exists from the extension host. |
| `RendererIndexMissing` | The folder exists but has no `index.html`. | Add an `index.html` in the folder you pointed to. |
| `RendererManifestInvalid` | `renderer.json` is malformed. | Fix the JSON. `id` and `displayName` must be strings; `contractVersion` must be a number. |
| `RendererBlockedByTrust` | The workspace is in Restricted Mode and the preview folder lives inside the workspace. | Trust the workspace, or move the preview folder outside and reference it from user settings. See [Configuration → Workspace Trust](./configuration.md#security-workspace-trust). |

## "I see my preview, but it can't load images / scripts / fonts"

The preview runs in a strict sandbox: no network, no external CDNs, no inline `<script>` or `<style>`. Bundle the assets you need inside the preview folder and reference them with relative paths (`./styles.css`, `./logo.png`). See [Build Your Own Renderer](./renderer-authoring.md).

## Still stuck?

- [Open an issue](https://github.com/taogya/CustomViewer/issues) with the error code and a copy of your settings.
