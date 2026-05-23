# CustomViewer

[English README](./README.md)

**VS Code 上で、任意のテキストファイルを自作の HTML ページでプレビューできる拡張です。**

CustomViewer は、エディタの隣にプレビュータブを開き、拡張子ごとに指定した HTML ページ(=「レンダラー」)でファイル内容を表示します。Markdown、JSON、CSV、ログファイル、独自フォーマットまで、HTML/CSS/JS が書ければ自由にプレビューを作れます。

![CustomViewer 全体像](./docs/user/images/overview.png)

## こんなときに便利

- **好きな見た目でプレビューしたい。** `.md` や `.json` を、自分の用意した `index.html` で表示できます。
- **読み取り専用で予期せぬ動きをしない。** プレビューに渡るのは「保存済み」の内容だけ。自動更新もしません。
- **安全に動く。** プレビューは厳格なサンドボックスで動作し、ネットワーク通信や VS Code API へのアクセスはできません。

## 30 秒で試す

1. CustomViewer をインストールします(下の [インストール](#インストール) 参照)。
2. このリポジトリを VS Code で開きます。
3. [examples/settings/workspace.settings.jsonc](./examples/settings/workspace.settings.jsonc) の中身をワークスペース設定にコピーします。
4. [examples/sources/handbook.md](./examples/sources/handbook.md) を開きます。
5. `Cmd+Alt+V`(macOS)または `Ctrl+Alt+V`(Windows/Linux)を押します。

エディタの隣にタブが開き、同梱の **Docs Navigator** サンプルが Markdown を整形表示します。

![クイックスタート プレビュー](./docs/user/images/quickstart.png)

`.json` と `.c` 用のサンプルも同梱しています。詳細は [examples/README.md](./examples/README.md) を参照してください。

## コマンド一覧

| コマンド | ショートカット | 動作 |
| --- | --- | --- |
| CustomViewer: 既定レンダラーでプレビューを開く | `Cmd/Ctrl+Alt+V` | アクティブファイルをプレビューします。 |
| CustomViewer: レンダラーを選んでプレビューを開く | – | 拡張子に複数候補があるときに選択して開きます。 |
| CustomViewer: レンダラーを単独起動する | – | ソースファイル無しでレンダラーだけを開きます。 |
| CustomViewer: プレビューを再描画する | `Cmd/Ctrl+Alt+R` | 保存済みの内容を読み直して再表示します。 |

> CustomViewer は自動更新しません。ファイルを保存してから「再描画」を実行してください。

## 自分のプレビューを使う

VS Code の設定で、拡張子に対して `index.html` を含むフォルダを指定します。

```jsonc
{
  "customViewer.extensionRendererMap": {
    "md": [
      {
        "id": "my-md",
        "displayName": "My Markdown Preview",
        "path": "${workspaceFolder}/my-renderer"
      }
    ]
  }
}
```

パスは **絶対パス** または `${workspaceFolder}` で始まる形式で書きます。あとは `.md` ファイルを開いて `Cmd/Ctrl+Alt+V` を押すだけです。

詳しくは [ユーザーガイド](./docs/user/ja/getting-started.md) を参照してください。

## インストール

VS Code 上で:

1. 拡張機能ビューを開きます(`Cmd+Shift+X` / `Ctrl+Shift+X`)。
2. **CustomViewer** を検索して **Install** を押します。

コマンドラインからも入れられます。

```sh
code --install-extension taogya.customviewer
```

## ドキュメント

- [はじめに](./docs/user/ja/getting-started.md) — インストール、設定、最初のプレビュー表示
- [設定リファレンス](./docs/user/ja/configuration.md) — 設定項目とセキュリティ上の注意
- [自作プレビューを作る](./docs/user/ja/renderer-authoring.md) — レンダラーの書き方
- [レンダラー生成用 AI プロンプト](./docs/user/ja/ai-prompt.md) — AI アシスタントにレンダラーを作らせるためのひな型プロンプト
- [困ったときは](./docs/user/ja/troubleshooting.md) — エラーの読み解き方

## ライセンス

BSD 3-Clause。詳細は [LICENSE](./LICENSE) を参照してください。

---

## 開発者向け

ビルドや仕様はソースと一緒に管理しています。

- ローカル VSIX をビルド: `npm install` → `npm run package:vsix`
- テスト実行: `npm test`
- [要求定義書](./docs/README.md) と [基本設計](./docs/DESIGN.md)
- [Changelog](./CHANGELOG.md)
