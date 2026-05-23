# TASK-0003 Renderer Resolution

## Summary

設定読込、renderer manifest 読込、rendererRoots 探索、Trust を考慮した解決ロジックを実装する。

## Related Requirements

- FR-001 から FR-011
- FR-020 から FR-023
- AC-001 から AC-003
- AC-006 から AC-008

## Deliverables

- src/configuration.ts
- src/rendererManifest.ts
- src/rendererResolver.ts
- src/trustPolicy.ts
- 対応テスト

## Verification

- 明示マッピング優先
- rendererRoots 探索
- invalid path / missing index / trust block

## Status

- completed

## Completed Notes

- 設定読込、manifest 読込、rendererRoots 探索、Workspace Trust 制御を実装した。
- configuration / resolver / trust の自動テストで明示優先、探索、missing index、trust block を検証した。