# TASK-0002 Extension Bootstrap

## Summary

VS Code extension として build / test / package 可能な最小基盤を作る。

## Related Requirements

- FR-031
- NFR-007
- NFR-009
- AC-014

## Deliverables

- package.json
- tsconfig.json
- .vscodeignore
- src/ の初期 entrypoint
- test 実行基盤

## Planned Work

1. extension manifest を定義する
2. TypeScript compile と test scripts を定義する
3. VS Code test harness を追加する
4. Trace コメント規約をコードへ適用する

## Verification

- `npm run compile`
- `npm test`

## Status

- completed

## Completed Notes

- extension manifest、TypeScript build、VS Code test harness、Trace コメント規約を実装した。
- `npm run compile` と `npm test` が通過している。