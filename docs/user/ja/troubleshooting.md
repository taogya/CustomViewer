# 困ったときは

[English](../troubleshooting.md) · [README に戻る](../../../README.ja.md)

## 「プレビューが更新されない」

CustomViewer は自動更新しません。ファイルを **保存** してから **CustomViewer: プレビューを再描画する**(`Cmd/Ctrl+Alt+R`)を実行してください。

## 「ファイルを開いてもプレビューが出ない」

上から順に確認してください。

1. ファイルの拡張子が `customViewer.extensionRendererMap`(または `rendererRoots`)のキーと一致しているか。大文字小文字は区別されません(`.MD` と `.md` は同じ)。
2. 指定した `path` のフォルダが実際に存在するか。
3. CustomViewer が出した通知メッセージのエラーコード(下記)を確認する。

## エラーコード一覧

CustomViewer は問題を短いコードで通知します。

| コード | 意味 | 対応 |
| --- | --- | --- |
| `RendererPathInvalid` | パスが存在しない、絶対パスでも `${workspaceFolder}` 形式でもない、またはリモートセッションの反対側を指している。 | 絶対パスまたは `${workspaceFolder}` 形式を使い、拡張機能側からフォルダが見えるか確認する。 |
| `RendererIndexMissing` | フォルダはあるが `index.html` が無い。 | 指定したフォルダ直下に `index.html` を置く。 |
| `RendererManifestInvalid` | `renderer.json` が壊れている。 | JSON 構文を直す。`id`/`displayName` は文字列、`contractVersion` は数値。 |
| `RendererBlockedByTrust` | ワークスペースが制限モードで、プレビューフォルダがワークスペース内にある。 | ワークスペースを信頼するか、フォルダをワークスペース外へ移してユーザー設定から指定する。詳細は [設定 → Workspace Trust](./configuration.md#セキュリティ-workspace-trust)。 |

## 「プレビューは出るが、画像/スクリプト/フォントが読み込めない」

プレビューは厳格なサンドボックス内で動作します。ネットワーク通信、外部 CDN、インライン `<script>` / `<style>` はすべて遮断されます。必要なアセットはプレビューフォルダ内に同梱し、相対パス(`./styles.css`、`./logo.png`)で参照してください。詳細は [自作プレビューを作る](./renderer-authoring.md) を参照。

## それでも解決しない場合

- エラーコードと設定内容を添えて [Issue を作成](https://github.com/taogya/CustomViewer/issues) してください。
