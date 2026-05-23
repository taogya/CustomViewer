# CustomViewer Handbook

## Overview

CustomViewer lets a workspace map file extensions to dedicated HTML renderers.
The renderer host stays read only in the MVP and focuses on safe previews.

## Why It Exists

- Teams often need a format specific view without building a full extension.
- A shared renderer folder is easier to maintain than one viewer per file type.
- Search and navigation should live inside the renderer UI when the format needs it.

## Renderer Contract

Each renderer folder must contain `index.html` and may contain `renderer.json`.
The host passes the saved file content, extension, file name, and launch mode.

## Commands

### Open Default Preview

Open the highest priority renderer for the active file.

### Choose Renderer

Choose from all renderers that match the active extension.

### Rerender Preview

Manual rerender is the MVP update mechanism.

## Search Notes

This sample contains repeated words for search testing: renderer, preview, search, navigation.

## Appendix

```json
{
  "customViewer.rendererRoots": ["${workspaceFolder}/examples/renderers"]
}
```