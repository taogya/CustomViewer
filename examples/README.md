# Examples

This folder contains sample renderer assets, sample source files, and sample settings for the CustomViewer MVP.

Full user guides:

- [../README.md](../README.md)
- [../README.ja.md](../README.ja.md)
- [../docs/user/getting-started.md](../docs/user/getting-started.md)
- [../docs/user/ja/getting-started.md](../docs/user/ja/getting-started.md)

## Structure

```text
examples/
  settings/
    workspace.settings.jsonc
  sources/
    handbook.md
    catalog.json
    sample.c
  renderers/
    by-extension/
      md/docs-navigator/
      json/rich-inspector/
      c/function-browser/
```

## Intent

- `settings/` shows how to wire the example renderers into `customViewer` settings.
- `sources/` provides files that can be opened in VS Code and previewed by the renderer samples.
- `renderers/` provides standalone sample renderer folders that follow the MVP contract.

## Usage

1. Open this repository as a workspace.
2. Copy the contents of `examples/settings/workspace.settings.jsonc` into workspace settings.
3. Open one of the files under `examples/sources/`.
4. Launch the matching CustomViewer preview command.

With the bundled Markdown sample, source-relative Markdown links can move within the same preview when the current renderer can handle the target. Unsupported targets fall back to the editor.