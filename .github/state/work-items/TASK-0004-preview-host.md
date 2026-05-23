# TASK-0004 Preview Host

## Summary

WebviewPanel ベースの preview host、コマンド、手動再描画、host bridge を実装する。

## Related Requirements

- FR-012 から FR-025
- AC-001 から AC-008

## Deliverables

- src/commands.ts
- src/previewManager.ts
- src/previewDocument.ts
- media/hostBridge.js
- 対応テスト

## Verification

- 既定起動
- renderer 選択起動
- standalone 起動
- panel 再利用
- 手動再描画

## Status

- completed

## Completed Notes

- WebviewPanel ベースの preview host、コマンド、preview document、host bridge を実装した。
- previewManager / previewDocument の自動テストで既定起動、選択起動、standalone、panel 再利用、手動 rerender を検証した。