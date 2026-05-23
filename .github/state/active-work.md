# Active Work State

軽量な引き継ぎ用。直近の判断、次アクション、検証状態だけを残します。

## Current Focus

- TASK-0006 (ユーザー向けドキュメントの日英整備) が完了。
- 次アクション候補: `RendererNotFound` 未使用問題の整理、または VSIX packaging / publish 運用の具体化。

## Latest Handoff

- 2026-05-23 (TASK-0006 完了):
  - ルート `README.md` (英語) と `README.ja.md` (日本語) を追加し、導入、使い方、設定、Trust、authoring、troubleshooting への導線を整理した。
  - `docs/user/` と `docs/user/ja/` に getting-started / configuration / workspace-trust / renderer-authoring / troubleshooting を追加した。
  - `CHANGELOG.md` を追加し、`examples/README.md` から新しいユーザー向け導線へリンクした。
  - `package.nls.json` と `package.nls.ja.json` を導入し、`package.json` の displayName / description / command title / configuration description をローカライズ参照へ置換した。
  - `test/suite/contributions.test.ts` を更新し、manifest のローカライズ参照と package.nls の存在を検証するようにした。
  - 検証: `npm run compile && npm test` PASS (22 passing)。
- 2026-05-23 (レビュー):
  - 要求 (docs/README.md) / 基本設計 (docs/DESIGN.md) / 実装 (src/) / テスト (test/) のレビューを実施した。
  - 設計・実装・テストは MVP 基線 (FR-001..FR-031 / AC-001..AC-014) を満たしており、`npm test` 22 件 PASS。
  - 軽微な不整合: `RendererNotFound` (src/errors.ts) が定義のみで throw されていない (DESIGN §6.7 と乖離)。要 fix だが本筋の阻害要因ではない。
  - 主課題: ユーザー向けドキュメントが不足。ルート README.md が無く、日本語/英語の利用者向け説明、CHANGELOG、`package.nls.*` も未整備。参考 lingobridge との差分が大きい。
  - 対応: TASK-0006 (User-Facing Docs JA/EN Bilingual) を起票した。
- 2026-05-23 (実装):
  - extension manifest、TypeScript build、VS Code test harness、preview host、renderer resolver、trust policy、examples renderer を実装した。
  - sample renderer は host bridge の `custom-viewer:update` 契約へ追従するよう更新し、saved-content-only の手動 rerender に追従可能にした。
  - 要求確認テストとして configuration / resolver / trust / preview host / preview document / examples UI / traceability を追加した。
  - `npm run compile` と `npm test` が通過し、22 件の自動テストが PASS している。
  - 現時点で README と DESIGN の MVP 基線に対応する実装・テストが揃っている。

## Verification

- `npm run compile` PASS
- `npm test` PASS (22 passing)
- examples renderer は Markdown / JSON / C の要件確認テストを実装済み。
- ルート README / README.ja / `docs/user/` / `docs/user/ja/` / `CHANGELOG.md` / `package.nls.*` を追加済み。

## Backlog (次期候補)

- TASK-0006: ユーザー向けドキュメントの日英整備 (起票済み)。
- `RendererNotFound` 未使用の解消 (src/errors.ts と DESIGN §6.7 の乖離)。
- 拡張表示名の最終決定。
- VSIX packaging / publish 運用の詳細化。
- 依存関係の deprecation / audit 警告の整理。