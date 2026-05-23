# AI プロンプト: CustomViewer プレビューを生成してもらう

[English](../ai-prompt.md) · [README に戻る](../../../README.ja.md)

下のプロンプトを AI コーディングアシスタント(Copilot Chat、Cursor、Claude、ChatGPT など)に渡せば、CustomViewer 用のプレビューを生成してもらえます。

送る前に、下の「設定値」セクションだけを書き換えてください。

---

## プロンプトテンプレート

````
あなたは VS Code 拡張機能 **CustomViewer** 向けの「レンダラー」を作成します。

レンダラーは `index.html`(+ 必要に応じてローカル CSS/JS/アセット)を含む
フォルダです。CustomViewer はその HTML をサンドボックス付き WebView 内で
読み込み、開かれたファイルの内容を JSON ペイロードで渡します。

送る前に、下の「設定値」セクションだけを編集してください。それ以外の文章は原則そのまま使ってください。

# 設定値
このセクションの値を唯一の入力値として使い、以降のフォルダ名、`renderer.json`、`<title>`、説明文に正確に反映してください。

```yaml
targetExtension: md
rendererId: my-renderer
displayName: My Renderer
description: 一文の説明
outputRoot: tmp
uiRequirements: |
  ここに自由記述。例: Markdown を HTML に変換して表示し、見出しから作った
  折りたたみ式の目次を左サイドに表示する。
```

下の仕様に従って 1 つのレンダラーを生成してください。

# 仕様
- 対象拡張子は `targetExtension` を使う。
- レンダラー id(フォルダ名、kebab-case)は `rendererId` を使う。
- 表示名は `displayName` を使う。
- 説明文は `description` を使う。
- UI / 動作要件は `uiRequirements` を使う。

# 出力
レンダラーを次のフォルダに生成してください。

`<outputRoot>/by-extension/<targetExtension>/<rendererId>/`

以下のファイルを生成してください。
1. `index.html`
2. `app.js`
3. `styles.css`
4. `renderer.json`

# 厳守ルール(CustomViewer のサンドボックス)
WebView は厳格な Content Security Policy を適用します。生成コードは
必ず次をすべて守ってください。
- インライン `<script>` / `<style>` 禁止(必ず外部 `./app.js` と
  `./styles.css` を使う)。
- 外部 CDN 禁止。`<link>` / `<script>` / `<img>` / `@font-face` から
  リモート URL を参照しない。すべてレンダラーフォルダ内のローカル
  ファイルにすること。
- `fetch` / `XMLHttpRequest` / WebSocket などのネットワーク通信は禁止。
- `vscode` API、Node.js API の使用禁止。標準ブラウザ DOM のみ。
- レンダラー自身が持つファイルだけを、レンダラーフォルダ基準の相対パスで
  参照する(例: `./styles.css`、`./app.js`、`./logo.png`)。
- `payload.savedTextContent` 由来の Markdown 本文に出てくる相対リンクや
  相対画像は、レンダラーフォルダ基準で解決しない。後述の
  `window.CustomViewerHost.openLink()` / `resolveImage()` を使うこと。

# 実行時契約
CustomViewer はスクリプト実行前にヘルパーを注入します。次の形で使ってください。

```js
window.addEventListener("custom-viewer:update", (event) => {
  const { payload } = event.detail;
  render(payload);
});

function render(payload) {
  // payload.savedTextContent  : string | null  (保存済みファイル本文)
  // payload.fileName          : string | null
  // payload.sourceUri         : string | null
  // payload.normalizedExtension : string | null (小文字、例: "md")
  // payload.launchMode        : "file" | "standalone"
  // payload.renderer          : { id: string, displayName: string }
  // payload.workspaceTrust    : { isTrusted: boolean }
  // ...
}
```

`launchMode === "standalone"` または `savedTextContent === null` の
ときは、クラッシュさせず、わかりやすい空状態を表示してください。

必要に応じて、次の helper も使えます。

- `window.CustomViewerHost.getPayload()` : 最新 payload を取得する。
- `window.CustomViewerHost.postLog(level, message)` : VS Code の出力ログへ書く。
- `window.CustomViewerHost.openLink(href)` : `payload.savedTextContent` から生成した
  ソース文書基準の相対文書リンク、または外部 URL の click 処理で使う。
  生の相対 `href` ナビゲーションに頼らず、click を捕まえてこれを呼ぶこと。
- `window.CustomViewerHost.resolveImage(href)` : `payload.savedTextContent` から生成した
  ソース文書基準の相対画像パスで使う。`await` して返ってきた URL を `img.src`
  に設定すること。

Markdown を HTML に変換するレンダラーでは、少なくとも次の方針を守ってください。

```js
document.addEventListener("click", (event) => {
  const anchor = event.target.closest("a[data-source-href]");
  if (!anchor) {
    return;
  }

  event.preventDefault();
  window.CustomViewerHost.openLink(anchor.dataset.sourceHref || "");
});

const resolvedImageUrl = await window.CustomViewerHost.resolveImage("./images/overview.png");
if (resolvedImageUrl) {
  image.src = resolvedImageUrl;
}
```

# renderer.json
次の内容で `renderer.json` を生成してください。各値は「設定値」セクションから埋めてください。
```json
{
  "contractVersion": 1,
  "id": "<rendererId>",
  "displayName": "<displayName>",
  "description": "<description>",
  "supportedExtensions": ["<targetExtension>"]
}
```

# index.html の雛形
次の骨組みから始め、body を埋めてください。
```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <title><displayName></title>
    <link rel="stylesheet" href="./styles.css">
    <script src="./app.js" defer></script>
  </head>
  <body>
    <main id="app"></main>
  </body>
</html>
```

# 出力形式
4 ファイルすべてを、ファイル名をラベルにした fenced code block で
そのまま返してください。他のファイルは作らないでください。
````

---

## ヒント

- ライブラリ(Markdown パーサーなど)が必要なときは、ファイルを **同梱**(vendor)してもらい、`<script src="./lib.js">` のような相対パスで参照させてください。CDN リンクは遮断されます。
- このテンプレートは `customViewer.rendererRoots` にそのまま載せやすいように、`<outputRoot>/by-extension/<extension>/<renderer-id>/` の構成を既定にしています。`extensionRendererMap` にフォルダを直接登録する運用なら、出力先だけ変えて構いません。
- 生成されたフォルダを任意の場所に保存し、設定に追加するだけで使えます。詳細は [設定リファレンス](./configuration.md)。
- プレビューが真っ白の場合は、`Developer: Open Webview Developer Tools` で開いて CSP 違反を確認してください。

## 関連

- [自作プレビューを作る](./renderer-authoring.md) — 仕様の詳細リファレンス。
- [設定リファレンス](./configuration.md) — 生成したフォルダを登録する方法。
- [困ったときは](./troubleshooting.md) — よくあるエラー。
