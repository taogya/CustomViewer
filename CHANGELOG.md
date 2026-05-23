# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-23

### Added

- Open Settings command for jumping directly into CustomViewer configuration.
- User-facing guidance for getting started, configuration, troubleshooting, and AI-assisted renderer authoring.

### Changed

- Improved the bundled Markdown sample renderer with richer inline formatting, source-relative document links that can navigate within the same preview with editor fallback, and source-relative local image rendering.
- Updated packaging and release metadata for Marketplace-oriented installation and local VSIX packaging.

## [0.0.1] - 2026-05-23

### Added

- Initial MVP for extension-based custom HTML previews in VS Code.
- Explicit renderer mapping and convention-based discovery via `customViewer.extensionRendererMap` and `customViewer.rendererRoots`.
- Preview commands for default launch, renderer selection, standalone renderer launch, and manual rerender.
- Read-only payload delivery that uses saved file content only.
- Limited Workspace Trust support that blocks workspace-local renderers in Restricted Mode and keeps safe user-scoped renderers available.
- Example renderer packages and sample source files for Markdown, JSON, and C under `examples/`.