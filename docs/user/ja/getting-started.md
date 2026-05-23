# はじめに

[English](../getting-started.md) · [README に戻る](../../../README.ja.md)

ゼロからプレビューが表示されるまでの手順です。

## 1. CustomViewer をインストールする

[README のインストール手順](../../../README.ja.md#インストール)を参照してください。

## 2. 作業フォルダを開く

CustomViewer の設定は **ワークスペース** または **ユーザー** の `settings.json` から読まれます。使いたいフォルダを VS Code で開いてください。

同梱サンプルをそのまま試したい場合は、このリポジトリを開きます。

## 3. どのプレビューを使うかを設定する

ワークスペースの `.vscode/settings.json` に追記します。

```jsonc
{
  "customViewer.extensionRendererMap": {
    "md": [
      {
        "id": "docs-navigator",
        "displayName": "Docs Navigator",
        "path": "${workspaceFolder}/examples/renderers/by-extension/md/docs-navigator"
      }
    ]
  }
}
```

`path` は **絶対パス** または `${workspaceFolder}` 始まりでなければなりません。`./renderers/my-md` のような相対パスは無効です。

> サンプルを試すなら、[../../../examples/settings/workspace.settings.jsonc](../../../examples/settings/workspace.settings.jsonc) の内容をそのままコピーすれば `.md` / `.json` / `.c` のサンプルが一度に有効になります。

## 4. ファイルを開いてプレビュー

1. `.md` ファイルをエディタで開きます。
2. `Cmd+Alt+V`(macOS)または `Ctrl+Alt+V`(Windows/Linux)を押します。

エディタの隣にプレビュータブが開きます。

![エディタ横にプレビュー](../images/quickstart.png)

## 5. ファイルを編集したあと

CustomViewer は **自動更新しません**。最新内容を反映するには次の手順を踏みます。

1. ファイルを **保存** する。
2. `Cmd+Alt+R` / `Ctrl+Alt+R`(プレビューを再描画)を押す。

これは意図的な仕様で、編集中にプレビューが揺れないようにするためです。

## 次に読むもの

- 開くプレビューをもっと細かく制御したい → [設定リファレンス](./configuration.md)
- 自分でプレビューを書きたい → [自作プレビューを作る](./renderer-authoring.md)
- うまく動かない → [困ったときは](./troubleshooting.md)
