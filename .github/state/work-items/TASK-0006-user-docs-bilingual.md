# TASK-0006 User-Facing Docs (JA/EN Bilingual)

## Summary

CustomViewer のユーザー向けドキュメントを整備する。Marketplace 公開と利用者向け導線を踏まえ、リポジトリルートの `README.md` を起点とした「導入・使い方・設定・トラブルシュート」を、日本語と英語の双方で揃える。参考は taogya/lingobridge の README / `docs/` 構成と `package.nls.*.json` による UI 文言の多言語化。

現状の `docs/README.md` は要求定義書（正本）であり、利用者向け説明には使えない。`examples/README.md` は英語短文のみで、利用者向けエントリポイントとしては不足している。

## Related Requirements

- NFR-001 (Marketplace 公開を前提とした説明可能なセキュリティ境界)
- NFR-004 (利用者が修正行動を判断できるメッセージ粒度) — エラー説明ドキュメント化
- FR-001 から FR-007, FR-022, FR-023 (設定・Trust の利用者説明)
- FR-012 から FR-018 (起動導線・再描画の利用者説明)
- FR-026 から FR-030 (examples 配下サンプルの利用ガイド)

## Background / Findings

レビュー結果サマリ:

- 要求 (docs/README.md) と基本設計 (docs/DESIGN.md) は整合済み。
- src/ 実装と test/ は FR-001..FR-031 / AC-001..AC-014 をカバー済み (`npm test` 22 件 PASS)。
- 軽微な不整合: `RendererNotFound` が `src/errors.ts` に定義されているが throw されていない (DESIGN §6.7 と乖離)。本 TASK のスコープ外、別途整理。
- ユーザー向けドキュメントが不足:
  - リポジトリルートに `README.md` が無い (Marketplace の overview 表示にも影響)。
  - 日本語/英語の利用者向け説明が揃っていない。
  - `CHANGELOG.md` が無い。
  - `package.nls.json` / `package.nls.ja.json` が無く、コマンド名・設定説明が英語固定。
  - 参考の lingobridge は `README.md` (日本語) + `docs/setup/*` + `l10n/` + `package.nls.*` で多言語化している。

## Deliverables

- ルート `README.md` (英語、Marketplace 表示用の正)
- ルート `README.ja.md` (日本語ミラー、または `docs/ja/README.md`)
- `docs/user/` (または `docs/setup/`) 配下のセットアップ・設定詳細を日英で配置
  - getting-started (起動の 3 手順、Default / Choose / Standalone / Rerender)
  - configuration (extensionRendererMap / rendererRoots / `${workspaceFolder}` 規則)
  - workspace-trust (Restricted Mode で何が起きるか、ユーザー設定外し方)
  - renderer-authoring (index.html 必須、renderer.json 任意、CSP 制約、host bridge `custom-viewer:update`)
  - troubleshooting (RendererPathInvalid / IndexMissing / ManifestInvalid / BlockedByTrust 各エラーの読み方と次行動 — NFR-004 連動)
- `CHANGELOG.md` (Keep a Changelog 形式、v0.0.1 エントリ)
- `package.nls.json` (英語、既定) と `package.nls.ja.json` (日本語) を導入し、`package.json` の command title と configuration description を `%key%` 参照へ置換
- 既存 `examples/README.md` から新ユーザー docs への相互リンクを追加

## Out of Scope

- 要求・設計の変更
- 機能追加・実装変更 (`RendererNotFound` の throw 化など実装課題は別 TASK)
- スクリーンショット差し替え (lingobridge の `resources/screenshots/` 相当は将来対応)

## Execution Plan

### Step 1: 情報設計

- ルート `README.md` の章立てを確定 (lingobridge 構成を踏襲):
  1. 概要 / What it does
  2. インストール (Marketplace / VSIX)
  3. 使い方 (4 コマンドとキーバインド)
  4. 設定 (extensionRendererMap / rendererRoots と `${workspaceFolder}`)
  5. examples の試し方
  6. Workspace Trust の挙動
  7. Renderer を作る (契約・CSP・host bridge)
  8. トラブルシュート (エラー種別ごと)
  9. ライセンス
- 英語版を正とし、日本語版は同じ章立てで対訳する。

完了条件:

- 章立てと配置先 (ルート vs `docs/user/`) が確定し、本 TASK に追記されている。

### Step 2: ルート README とミラーの作成

- `README.md` (英) を作成。
- `README.ja.md` または `docs/ja/README.md` を作成し相互リンク。
- `docs/README.md` (要求定義書) を取り違えないよう、本ファイル冒頭で「正式要求定義書」「利用者向けではない」旨を 1 行注記する案を検討。

完了条件:

- README から examples / 設定 / 公式要求書へリンクが通っている。

### Step 3: 詳細ドキュメント (docs/user/ または docs/setup/) の作成

- 上記 5 ドキュメントを日英で作成。
- renderer-authoring には DESIGN §5.5 / §6.6 の CSP と message contract を利用者向けに噛み砕いた内容を入れる。
- troubleshooting は `src/errors.ts` の 4 つの実用エラー + Trust ブロックを 1 章ずつ。

完了条件:

- 各 FR/AC への参照 (Trace コメント相当) を脚注または末尾に残す。

### Step 4: 多言語 UI (package.nls)

- `package.nls.json` / `package.nls.ja.json` を追加。
- `package.json` の `contributes.commands[*].title` と `contributes.configuration.properties.*.markdownDescription` を `%key%` 参照へ置換。
- `npm test` と extension 起動で UI 文字列が壊れていないこと確認。

完了条件:

- VS Code 言語設定を ja/en で切替えてコマンド表示が切り替わる。
- 既存 `contributions.test.ts` が PASS のまま (必要なら `%key%` 許容に更新)。

### Step 5: CHANGELOG

- `CHANGELOG.md` を Keep a Changelog 形式で作成。
- v0.0.1 に「Initial MVP: explicit/convention renderer resolution, saved-content-only manual rerender, Workspace Trust limited support, examples for md/json/c」を記載。

完了条件:

- README からリンク済み。

### Step 6: 仕上げ

- `.vscodeignore` に新規ユーザー docs (`docs/user/**` 等) を含めるかを判断 (Marketplace に出すなら README のみで十分、巨大化は避ける)。
- `active-work.md` を更新し本 TASK を completed へ。

完了条件:

- `npm run compile` と `npm test` が PASS。
- README が GitHub / Marketplace 双方で破綻なく表示されることをローカルで確認。

## Verification

- ルート `README.md` と日本語版が存在し、相互リンクが通る。
- `docs/user/` (または `docs/setup/`) に 5 トピック × 2 言語が揃う。
- `package.nls.json` / `package.nls.ja.json` が読み込まれ、コマンド表示が言語切替で変化する。
- `CHANGELOG.md` に v0.0.1 のエントリがある。
- `npm test` が全件 PASS のまま。
- 既存 `docs/README.md` (要求書) と `docs/DESIGN.md` の役割が混ざっていない。

## Status

- completed

## Open Questions

- 解決済み: Marketplace overview はルート `README.md` を英語正とし、日本語ミラーはルート `README.ja.md`、詳細ガイドは `docs/user/` / `docs/user/ja/` に配置した。
- 解決済み: ルート README から `docs/` と `examples/` への導線は GitHub URL を使い、`.vscodeignore` で追加ドキュメントを VSIX に同梱しなくても Marketplace 側リンクが成立する構成にした。
- 未解決: `RendererNotFound` 未使用問題は本 TASK の対象外のまま。別タスクとして扱うのが妥当。
