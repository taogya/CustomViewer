# 自作プレビューを作る

[English](../renderer-authoring.md) · [README に戻る](../../../README.ja.md)

「プレビュー」は `index.html` を含むフォルダです。CustomViewer はその HTML をサンドボックス内で読み込み、ユーザーが開いたファイルの内容を渡します。

静的な Web ページが書ければ作れます。

## 最小構成

```text
my-renderer/
  index.html
  app.js          # 任意
  styles.css      # 任意
  renderer.json   # 任意(メタデータ)
```

必須は `index.html` だけです。ローカルアセットは相対パスで参照します。

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="./styles.css">
    <script src="./app.js" defer></script>
  </head>
  <body>
    <main id="app"></main>
  </body>
</html>
```

## ファイル内容を受け取る

CustomViewer はページに小さなヘルパーを注入します。開かれたファイルを受け取るには次のように書きます。

```js
window.addEventListener("custom-viewer:update", (event) => {
  const { payload } = event.detail;
  const app = document.getElementById("app");
  app.textContent = payload.savedTextContent ?? "ファイルが開かれていません。";
});
```

`payload` に含まれる項目:

| 項目 | 説明 |
| --- | --- |
| `savedTextContent` | 開かれたファイルの保存済みテキスト(単独起動時は `null`)。 |
| `fileName` | ファイル名。例: `"handbook.md"`。 |
| `sourceUri` | ファイルの完全な URI。 |
| `normalizedExtension` | 小文字化された拡張子。例: `"md"`。 |
| `launchMode` | `"file"` または `"standalone"`。 |
| `renderer.id`, `renderer.displayName` | このプレビュー自身の識別情報。 |
| `workspaceTrust.isTrusted` | ワークスペースが信頼済みかどうか。 |

いつでも `window.CustomViewerHost.getPayload()` で最新 payload を取得でき、`window.CustomViewerHost.postLog("info", "...")` で VS Code 出力ログに書き出せます。

保存済みテキストからリンクや画像を組み立てるレンダラー向けに、次の限定 API も使えます。

| ヘルパー | 説明 |
| --- | --- |
| `window.CustomViewerHost.openLink(href)` | ソース文書基準の相対リンク、または外部 URL をホスト側で処理します。対応可能な相対テキスト target は現在のプレビューを再描画し、それ以外はエディタ表示や外部起動へ fallback します。 |
| `window.CustomViewerHost.resolveImage(href)` | ソース文書基準の相対画像パスを WebView で使える URL に変換します。戻り値は `Promise<string \| null>` です。 |

例:

```js
const imageUrl = await window.CustomViewerHost.resolveImage("./images/overview.png");
if (imageUrl) {
  document.querySelector("img").src = imageUrl;
}

document.querySelector("a[data-doc]")?.addEventListener("click", (event) => {
  event.preventDefault();
  window.CustomViewerHost.openLink("./README.md");
});
```

これらは意図的に範囲を絞った API です。汎用のファイルシステムアクセスや任意の VS Code API を公開するものではありません。

## 任意の `renderer.json`

選択 UI に分かりやすい名前を出したい場合は、`index.html` の隣に `renderer.json` を置きます。

```json
{
  "contractVersion": 1,
  "id": "docs-navigator",
  "displayName": "Docs Navigator",
  "description": "見出しナビゲーション付き Markdown プレビュー。",
  "supportedExtensions": ["md"]
}
```

`contractVersion` 以外はすべて任意です。

## サンドボックスのルール

セキュリティのため、CustomViewer はすべてのプレビューに厳格な Content Security Policy を適用します。

- **許可されるもの**: プレビューフォルダ内に同梱したアセット(CSS、JS、画像、フォント)。
- **禁止されるもの**: インライン `<script>` / `<style>`、外部 CDN、ネットワーク通信、VS Code API、ファイルシステムアクセス。

ライブラリを使いたい場合は、プレビューフォルダ内に同梱してください。

## コピー元として使えるサンプル

[`examples/renderers/by-extension/`](../../../examples/renderers/by-extension) 配下に動くサンプルが 3 つあります。

- `md/docs-navigator/` — Markdown の見出しナビゲーションと検索。
- `json/rich-inspector/` — JSON のカードビューとフィルタ。
- `c/function-browser/` — C の関数インデックスと折りたたみ表示。

## 関連

- [レンダラー生成用 AI プロンプト](./ai-prompt.md) — AI アシスタントにレンダラーを作らせる
- [設定リファレンス](./configuration.md)
- [困ったときは](./troubleshooting.md)
