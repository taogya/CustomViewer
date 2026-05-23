# 設定リファレンス

[English](../configuration.md) · [README に戻る](../../../README.ja.md)

CustomViewer の設定項目は 2 つだけです。ほとんどの方は 1 つ目だけで足ります。

## `customViewer.extensionRendererMap`

拡張子に、1 つ以上のプレビューフォルダ(`index.html` を含むフォルダ)を割り当てます。

```jsonc
{
  "customViewer.extensionRendererMap": {
    "md": [
      {
        "id": "docs-navigator",
        "displayName": "Docs Navigator",
        "path": "${workspaceFolder}/renderers/md/docs-navigator"
      }
    ],
    "json": [
      { "id": "rich-inspector", "path": "/Users/me/renderers/rich-inspector" },
      { "id": "json-raw",       "path": "/Users/me/renderers/json-raw" }
    ]
  }
}
```

- `Cmd/Ctrl+Alt+V` を押したときは **配列の先頭** が使われます。
- 「CustomViewer: レンダラーを選んでプレビューを開く」を実行すると全候補が選択肢に並びます。
- `id` は自分で決める安定した識別子、`displayName` は選択 UI に表示される名前です。

![レンダラー選択 UI](../images/choose-renderer.png)

## `customViewer.rendererRoots`(任意)

プレビューを一箇所にまとめて置いている場合は、親フォルダを指定するだけで自動的に拾えます。次のディレクトリ構成が前提です。

```text
<root>/by-extension/<拡張子>/<id>/index.html
```

```jsonc
{
  "customViewer.rendererRoots": [
    "${workspaceFolder}/renderers",
    "/Users/me/shared-renderers"
  ]
}
```

`rendererRoots` は `extensionRendererMap` の **後** に探索されます。両方を併用しても構いません。

## パスの書き方

どちらの設定でも、パスは次のいずれかである必要があります。

- 絶対パス(`/Users/me/...`、`C:\...`)
- `${workspaceFolder}/...`
- `${workspaceFolder:<name>}/...`(マルチルートワークスペース用)

`./renderers/md` のような単純な相対パスは無効です。

リモート環境(SSH、Dev Containers、WSL、Codespaces)では、プレビューフォルダは **VS Code 拡張機能が動いている側**(通常はリモート側)に置く必要があります。

## セキュリティ: Workspace Trust

CustomViewer は指定された HTML/CSS/JS を実行するため、[VS Code の Workspace Trust](https://code.visualstudio.com/docs/editor/workspace-trust) を尊重します。

| ワークスペースのモード | CustomViewer の動作 |
| --- | --- |
| **信頼済み(Trusted)** | すべての設定とプレビューフォルダが使えます。ワークスペース内のフォルダも OK です。 |
| **制限モード(Restricted)** | ワークスペース由来の設定は無視されます。ワークスペース **内** にあるプレビューフォルダは使えません。**ユーザー** 設定で指定されたワークスペース外のフォルダは引き続き使えます。 |

![制限モードでの動作](../images/restricted-mode.png)

ワークスペースを信頼せずにプレビューを使いたい場合は、フォルダをワークスペース外に置き、**ユーザー** 設定から指定してください。

## 使い分けのヒント

- **プロジェクト固有のプレビュー**: ワークスペース設定 + `${workspaceFolder}` パス
- **どのプロジェクトでも使う個人用プレビュー**: ユーザー設定 + 絶対パス
- **併用**: 既定だけ `extensionRendererMap`、残りは `rendererRoots`

## 関連

- [はじめに](./getting-started.md)
- [自作プレビューを作る](./renderer-authoring.md)
- [困ったときは](./troubleshooting.md)
