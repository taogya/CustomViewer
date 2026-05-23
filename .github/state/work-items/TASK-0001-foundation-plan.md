# TASK-0001 MVP Foundation Plan

## Summary

CustomViewer の MVP 実装に向けた初期実行計画を管理する。基本設計は [docs/DESIGN.md](docs/DESIGN.md) を正とし、本 TASK は作業順、完了条件、検証項目を管理する。

## Related Requirements

- FR-001 から FR-031
- NFR-007 から NFR-009
- AC-001 から AC-014

## Deliverables

- [docs/README.md](docs/README.md) の要求更新
- [docs/DESIGN.md](docs/DESIGN.md) の基本設計化
- [.github/state/active-work.md](.github/state/active-work.md) の運用開始
- examples 配下の renderer / source / settings サンプル骨格

## Execution Plan

### Step 1: 文書と state の整合化

- 要求差分を `docs/README.md` へ反映する
- `docs/DESIGN.md` を基本設計として整備する
- `active-work.md` と本 TASK にハンドオフ情報を集約する

完了条件:

- 正本、基本設計、TASK の役割が混ざっていない

### Step 2: 拡張基盤の bootstrap

- VS Code extension 用 `package.json` を作成する
- TypeScript / build / test harness を導入する
- Trace コメント規約をコード側へ反映する

完了条件:

- `npm test` が実行可能

### Step 3: renderer 解決と Trust 制御

- 明示マッピングと rendererRoots の解決実装
- `${workspaceFolder}` 展開
- Restricted Mode の制限実装

完了条件:

- FR-001 から FR-007、FR-022、FR-023 の主要ケースがテスト化される

### Step 4: WebView ホストとコマンド

- 既定起動、選択起動、standalone 起動、手動再描画を実装
- WebView 再利用と CSP / localResourceRoots を実装

完了条件:

- AC-001 から AC-008 の主要ケースがテスト化される

### Step 5: examples と renderer UI テスト

- examples renderer を host bridge 契約に合わせる
- Markdown / JSON / C の UI テストを追加する

完了条件:

- AC-009 から AC-012 を自動テストで確認できる

### Step 6: パッケージング確認

- VSIX 同梱方針を確認する
- 不要ファイル除外と公開前回帰を行う

完了条件:

- 公開準備に必要な検証が一通り揃う

## Planned Steps

1. 要求差分を docs/README.md へ反映する
2. docs/DESIGN.md を基本設計へ置き換える
3. `.github/state` 運用を開始する
4. examples のファイル構成と初期サンプルを用意する
5. Step 2 以降の実装へ着手する

## Verification Plan

- Markdown / instruction diagnostics が clean であること
- examples 追加後にディレクトリ構成が計画通りであること

## Status

- state と計画文書の作成完了
- docs/DESIGN.md の基本設計化を反映中
- examples 初期資産の作成完了
- 次は Step 2 の実装基盤へ移行