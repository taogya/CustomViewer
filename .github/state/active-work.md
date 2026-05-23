# Active Work State

軽量な引き継ぎ用。直近の判断、次アクション、検証状態だけを残します。

## Current Focus

- v0.1.0 リリース候補の実装・ドキュメント・パッケージ検証まで完了。
- 次アクション候補: Marketplace 公開作業、または `RendererNotFound` 未使用問題の整理。

## Latest Handoff

- 2026-05-23 (source-relative link navigation 改善):
  - `open-link` の host 側セマンティクスを拡張し、現在の renderer が扱える source-relative text target は同一プレビューセッション内で `rerender` するよう変更した。対象外は従来通りエディタ起動へ fallback する。
  - 要求と設計を更新し、FR-032 / AC-015 を「同一プレビュー遷移 + fallback」前提へ修正した。
  - `test/suite/previewManager.test.ts` を更新し、同一プレビュー遷移と unsupported target の editor fallback を検証するようにした。
  - 利用者向け README と renderer authoring 文書、`examples/README.md`、`CHANGELOG.md` を現挙動へ追従させた。
  - 検証: `npm run compile` PASS、`npm test` PASS (27 passing)。
- 2026-05-23 (v0.1.0 リリース候補):
  - `PreviewManager` と `media/hostBridge.js` に、source-relative 文書リンクを開く `open-link` と、source-relative 画像を WebView URI に解決する `resolve-image` の限定 host mediation を追加した。
  - 同梱 Markdown renderer (`examples/renderers/by-extension/md/docs-navigator/`) を更新し、見出し slug ベースのアンカー、source-relative リンク起動、source-relative ローカル画像表示に対応した。
  - `test/suite/previewManager.test.ts` と `test/suite/examplesMarkdown.test.ts`、`test/suite/helpers/domHarness.ts` を更新し、新しい link/image フローを自動テスト化した。
  - `README.md` / `README.ja.md` の制約説明を現挙動に合わせて更新し、`docs/user/renderer-authoring.md` / `docs/user/ja/renderer-authoring.md` に `CustomViewerHost.openLink()` / `resolveImage()` を追記した。
  - `package.json` / `package-lock.json` を `0.1.0` に更新し、`CHANGELOG.md` に `0.1.0` を追加した。
  - 検証: `npm test` PASS (26 passing)、`npm run package:vsix` PASS、`code --install-extension ./customviewer-0.1.0.vsix --force` PASS。
- 2026-05-23 (TASK-0006 完了):
  - ルート `README.md` (英語) と `README.ja.md` (日本語) を追加し、導入、使い方、設定、Trust、authoring、troubleshooting への導線を整理した。
  - `docs/user/` と `docs/user/ja/` に getting-started / configuration / renderer-authoring / troubleshooting を追加し、Workspace Trust の説明は configuration へ統合した。
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
- `npm test` PASS (27 passing)
- `npm run package:vsix` PASS
- `code --install-extension ./customviewer-0.1.0.vsix --force` PASS
- examples renderer は Markdown / JSON / C の要件確認テストを実装済み。
- ルート README / README.ja / `docs/user/` / `docs/user/ja/` / `CHANGELOG.md` / `package.nls.*` を整備済み。

## Backlog (次期候補)

- `RendererNotFound` 未使用の解消 (src/errors.ts と DESIGN §6.7 の乖離)。
- 拡張表示名の最終決定。
- VSIX packaging / publish 運用の詳細化と Marketplace 公開手順の固定化。
- 依存関係の deprecation / audit 警告の整理。