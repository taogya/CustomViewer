# Getting Started

[日本語](./ja/getting-started.md) · [Back to README](../../README.md)

This guide takes you from zero to a working preview.

## 1. Install CustomViewer

See [Install](../../README.md#install) in the main README.

## 2. Open a workspace

CustomViewer settings are read from your **workspace** or **user** settings (`settings.json`). Open the folder you want to work in.

If you just want to try the bundled samples, open this repository.

## 3. Tell CustomViewer which preview to use

Add to your workspace settings (`.vscode/settings.json`):

```jsonc
{
  "customViewer.extensionRendererMap": {
    "md": [
      {
        "id": "docs-navigator",
        "displayName": "Docs Navigator",
        "path": "${workspaceFolder}/examples/renderers/by-extension/md/docs-navigator"
      }
    ]
  }
}
```

The `path` value must be either an **absolute path** or start with `${workspaceFolder}`. Plain relative paths like `./renderers/my-md` are not accepted.

If you want to jump straight to the settings UI, run **CustomViewer: Open Settings** from the Command Palette.

> Trying the samples? Copy [../../examples/settings/workspace.settings.jsonc](../../examples/settings/workspace.settings.jsonc) into your settings — it wires up the `.md`, `.json`, and `.c` samples at once.

## 4. Open a file and preview it

1. Open a `.md` file in the editor.
2. Press `Cmd+Alt+V` (macOS) or `Ctrl+Alt+V` (Windows/Linux).

A preview tab opens beside the editor.

## 5. After you edit a file

CustomViewer does **not** refresh automatically. To see your latest changes:

1. **Save** the file.
2. Press `Cmd+Alt+R` / `Ctrl+Alt+R` (Rerender Preview).

This is intentional — it keeps the preview stable while you edit.

## What's next

- Want more control over which preview opens? → [Configuration](./configuration.md)
- Want to write your own preview page? → [Build Your Own Renderer](./renderer-authoring.md)
- Something not working? → [Troubleshooting](./troubleshooting.md)
