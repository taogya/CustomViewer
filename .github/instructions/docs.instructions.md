---
description: "Use when editing product requirements, design documents, roadmap notes, or any Markdown under docs/. Covers source-of-truth order, stable IDs, and when to split design docs."
applyTo: "docs/**/*.md"
---

# Documentation Rules

- docs/README.md is the formal requirements baseline. Promote product decisions there before reflecting them in design or implementation.
- docs/IDEA.md remains a scratchpad for new ideas, risks, and research notes. Do not treat it as a ratified specification once docs/README.md exists.
- Formal requirements should stay testable and normative. Keep stable identifiers such as FR-xxx, NFR-xxx, and AC-xxx even when wording evolves.
- Keep docs/DESIGN.md as implementable basic design while the project is still small. Do not use it as a task plan or phase tracker. Split into docs/design/ only when a single document becomes hard to scan because of subsystem count, long contracts, or mixed audiences.
- If the design is split, keep docs/design/README.md as the index and preserve traceability from each design section back to docs/README.md.
- Prefer official VS Code documentation as the first source for platform constraints, especially around WebView, Workspace Trust, Remote execution, and Marketplace-facing security decisions.