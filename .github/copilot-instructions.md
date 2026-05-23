# Project Guidelines

## Product Baseline

- docs/README.md is the formal source of truth for current product requirements.
- docs/IDEA.md is an ideation scratchpad and must not override docs/README.md.
- docs/DESIGN.md is the active basic design document while the project is still small.
- .github/state/active-work.md is the source of truth for current in-flight task state and handoff notes.
- The current MVP baseline is: read-only preview, explicit mapping plus rendererRoots discovery, saved-content-only manual rerender, same-side renderer placement, Workspace Trust gating, and strict WebView security.

## Documentation Flow

- When requirements change, update docs/README.md before creating or changing design or implementation artifacts.
- Write implementable basic design in docs/DESIGN.md while the project remains small.
- Split design documents into docs/design/ only when one file becomes difficult to maintain because of subsystem count, long contracts, or mixed audiences.
- Keep traceability from design decisions and implementation changes back to requirement IDs in docs/README.md.
- Keep searchable FR-xxx / AC-xxx traceability comments in implementation and test files.

## Implementation Boundaries

- Do not add renderer-side file editing, shell execution, arbitrary command execution, or broad VS Code API exposure unless docs/README.md is updated first.
- Prefer WebviewPanel for the MVP path unless requirements are intentionally changed.
- Treat renderer paths, settings, and file contents as untrusted input at the host boundary even when renderers themselves are user-managed assets.

## Customization Maintenance

- Keep this file short and project-wide.
- Add detailed or file-specific rules under .github/instructions/*.instructions.md instead of expanding this file indefinitely.
- If future work needs prompts, agents, or skills, create them as separate files under .github rather than overloading the base instructions.

## Workflow

- For multi-session work, keep .github/state/active-work.md current with Current Focus, Latest Handoff, and Verification.
- Track discrete tasks under .github/state/work-items/TASK-XXXX-<slug>.md.
- Keep implementation plans, execution order, and next actions in TASK files, not in docs/DESIGN.md.
- If work stops mid-task, update active-work and the current work item before ending the session.