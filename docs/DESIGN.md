# CustomViewer 基本設計

## 1. 文書位置づけ

本書は CustomViewer MVP の実装可能な基本設計を定義する文書である。要求の正本は [README.md](./README.md) とし、本書はそれを満たすための構成、データ契約、処理方式、テスト方式を記述する。

実行順やフェーズ分解は本書では扱わない。作業計画、進捗、次アクションは `.github/state/work-items/` と `.github/state/active-work.md` で管理する。

## 2. 対象範囲

関連要求:

- 設定と解決: FR-001 から FR-007
- renderer 契約: FR-008 から FR-011
- 起動導線と表示: FR-012 から FR-015
- データ受け渡しと再描画: FR-016 から FR-019
- 異常系と信頼モデル: FR-020 から FR-025
- examples とトレーサビリティ: FR-026 から FR-031
- 品質要求: NFR-001 から NFR-009
- 受入条件: AC-001 から AC-016

本設計は以下を対象とする。

- VS Code 拡張本体
- renderer 解決と WebView ホスト
- examples 配下のサンプル renderer / source / settings
- 自動テスト基盤

以下は本設計の対象外とする。

- 編集可能 Custom Editor への移行
- renderer からの特権 API 呼び出し
- 保存契機やキー入力契機の自動再描画

## 3. 設計決定

### 3.1 ホスト方式

関連要求: FR-012 から FR-019, FR-024, FR-025

- MVP の表示ホストは `WebviewPanel` を採用する。
- `CustomReadonlyEditorProvider` と `CustomTextEditorProvider` は採用しない。
- 既存パネル再利用を前提とし、同一ソース + 同一 renderer の重複生成を避ける。

### 3.2 データ更新方式

関連要求: FR-016 から FR-019, AC-005

- renderer へ渡す本文は保存済みファイル内容のみとする。
- 再描画は手動コマンドのみで実施する。
- 自動監視や自動再読込は行わない。

### 3.3 セキュリティ方式

関連要求: FR-020 から FR-025, NFR-001

- renderer HTML は untrusted input として扱う。
- WebView は strict CSP、`localResourceRoots`、`asWebviewUri` を前提とする。
- Workspace Trust は `limited` サポートとし、Restricted Mode ではワークスペース起源の renderer を遮断する。

### 3.4 Remote 前提

関連要求: FR-007, AC-007, NFR-002

- renderer パスは常に拡張が動作する側のファイルシステム基準で解決する。
- Remote 環境でクライアント側ローカル絶対パスを参照する構成は無効とする。

## 4. 全体構成

### 4.1 論理コンポーネント

関連要求: FR-001 から FR-025

1. Activation Layer
   - 拡張の activate、コマンド登録、Workspace Trust イベント購読を担当する。

2. Configuration Layer
   - `customViewer.extensionRendererMap` と `customViewer.rendererRoots` を読み、正規化・検証する。

3. Renderer Registry
   - 明示マッピングと規約探索を統合し、利用可能 renderer 一覧を返す。

4. Trust Policy
   - Restricted Mode 時に利用可能 renderer / 設定を制限する。

5. Preview Session Manager
   - WebView パネル生成、再利用、破棄、手動再描画を管理する。

6. WebView Document Builder
   - renderer の `index.html` を読み、資産 URI 変換と host bridge 注入を行う。

7. Examples / Test Assets
   - examples 配下の renderer / source / settings をサンプルとテスト fixture の両方に使う。

### 4.2 想定ファイル分割

関連要求: FR-031, NFR-009

```text
src/
  extension.ts
  commands.ts
  configuration.ts
  trustPolicy.ts
  rendererManifest.ts
  rendererResolver.ts
  previewManager.ts
  previewDocument.ts
  errors.ts
media/
  hostBridge.js
test/
  suite/
    configuration.test.ts
    rendererResolver.test.ts
    previewManager.test.ts
    workspaceTrust.test.ts
    examplesMarkdown.test.ts
    examplesJson.test.ts
    examplesC.test.ts
```

各ファイルの主要関数や `describe` には `Trace: FR-xxx, AC-xxx` コメントを置く。

## 5. データ設計

### 5.1 設定スキーマ

関連要求: FR-001 から FR-007, AC-001, AC-002, AC-009

#### `customViewer.extensionRendererMap`

型:

```ts
type ExtensionRendererMap = Record<string, RendererMappingEntry[]>;

interface RendererMappingEntry {
  id: string;
  path: string;
  displayName?: string;
}
```

制約:

- key は正規化拡張子
- `id` と `path` は必須
- `path` は絶対パスまたは `${workspaceFolder}` / `${workspaceFolder:<name>}` 展開のみ許可

#### `customViewer.rendererRoots`

型:

```ts
type RendererRoots = string[];
```

制約:

- 配列順が探索優先順になる
- 各 root 配下の規約パスは `by-extension/<extension>/<renderer-id>/index.html`

### 5.2 renderer manifest

関連要求: FR-008 から FR-011

型:

```ts
interface RendererManifest {
  contractVersion: number;
  id: string;
  displayName: string;
  description?: string;
  supportedExtensions?: string[];
}
```

規則:

- `index.html` は必須
- `renderer.json` は任意
- `renderer.json` 不在時は設定 `id` またはディレクトリ名から補完する

### 5.3 内部解決モデル

関連要求: FR-005 から FR-007, FR-020, FR-021

```ts
interface ResolvedRenderer {
  extension: string;
  id: string;
  displayName: string;
  source: "explicit" | "root";
  rootUri: vscode.Uri;
  indexUri: vscode.Uri;
  manifestUri?: vscode.Uri;
  manifest?: RendererManifest;
}
```

### 5.4 プレビュー要求モデル

関連要求: FR-012 から FR-019

```ts
type LaunchMode = "file" | "standalone";

interface PreviewRequest {
  renderer: ResolvedRenderer;
  launchMode: LaunchMode;
  sourceUri?: vscode.Uri;
  normalizedExtension?: string;
}

interface PreviewPayload {
  sourceUri: string | null;
  fileName: string | null;
  normalizedExtension: string | null;
  savedTextContent: string | null;
  launchMode: LaunchMode;
  renderer: {
    id: string;
    displayName: string;
  };
  workspaceTrust: {
    isTrusted: boolean;
  };
}
```

### 5.5 WebView メッセージ契約

関連要求: FR-016 から FR-019, FR-024, FR-025, FR-032

MVP では広範な特権 API は公開しないため、双方向契約は最小限に限定する。

```ts
type WebviewToHostMessage =
  | { type: "renderer-ready" }
  | { type: "renderer-log"; level: "info" | "warn" | "error"; message: string }
  | { type: "open-link"; href: string }
  | { type: "resolve-image"; requestId: string; href: string };

type HostToWebviewMessage =
  | { type: "bootstrap"; payload: PreviewPayload }
  | { type: "rerender"; payload: PreviewPayload }
  | { type: "resolve-image-result"; requestId: string; resolvedUri: string | null };
```

`renderer-ready` を受けたあとに host が `bootstrap` を送る。これにより inline script を使わず初期データを渡せる。
`open-link` と `resolve-image` は sourceUri 文脈に限定した補助 API であり、任意ファイルアクセス用途には使えないよう host 側で境界を持つ。
`open-link` は、対象が現在の renderer で安全に扱える source-relative text target なら現在の `PreviewRequest` を差し替えて同一パネルへ `rerender` を返し、対象外は外部起動またはエディタ起動へ fallback する。

## 6. コンポーネント設計

### 6.1 Activation Layer

関連要求: FR-012 から FR-018, FR-022

責務:

- コマンド登録
- `workspace.onDidGrantWorkspaceTrust` の購読
- Preview Manager 初期化

公開コマンド:

- `customViewer.openDefaultPreview`
- `customViewer.chooseRendererPreview`
- `customViewer.openRendererStandalone`
- `customViewer.rerenderPreview`

### 6.2 Configuration Layer

関連要求: FR-001 から FR-007, FR-022, FR-023

責務:

- 設定値読込
- 拡張子正規化
- `${workspaceFolder}` 変数展開
- user / workspace 設定の出所区別

出力:

- 明示マッピング一覧
- rendererRoots 一覧

### 6.3 Trust Policy

関連要求: FR-022, FR-023, AC-006

判定ルール:

- trusted workspace: user / workspace の両設定を利用可能
- restricted mode:
  - workspace settings は renderer 関連キーを無効化
  - ワークスペース配下 renderer は起動不可
  - user settings 由来でワークスペース外の renderer のみ許可

### 6.4 Renderer Registry

関連要求: FR-003 から FR-011, AC-001, AC-002, AC-003

責務:

- 明示マッピング解決
- rendererRoots 規約探索
- `index.html` / `renderer.json` 読込
- display name 決定
- 優先順位付与

優先順位:

1. 明示マッピング
2. rendererRoots を設定順で探索した結果

### 6.5 Preview Session Manager

関連要求: FR-012 から FR-019, FR-032, AC-003, AC-004, AC-005, AC-015, AC-016

責務:

- パネル生成 / 再利用 / reveal
- パネルごとの `PreviewRequest` と最新 `PreviewPayload` の保持
- 手動再描画時の saved content 再取得
- source-relative text link の同一パネル遷移、fallback 起動、image 解決リクエストの仲介

パネルキー:

```ts
panelKey = `${renderer.id}|${launchMode}|${sourceUri?.toString() ?? "standalone"}`
```

MVP では `retainContextWhenHidden` は使わない。再表示時は webview 側が再度 `renderer-ready` を送り、host が最新 payload を返す。
host 媒介で sourceUri が切り替わる場合は、セッションが保持する `PreviewRequest`、パネルタイトル、再利用用キー、`localResourceRoots` を新しい target に合わせて更新する。

### 6.6 WebView Document Builder

関連要求: FR-008, FR-011, FR-025, FR-032

責務:

- `index.html` を UTF-8 として読込
- 相対参照の `href` / `src` を `asWebviewUri` へ変換
- `media/hostBridge.js` を先頭 script として注入
- CSP meta を強制挿入または置換

採用する CSP:

```html
default-src 'none';
img-src ${webview.cspSource} data:;
style-src ${webview.cspSource};
script-src ${webview.cspSource};
font-src ${webview.cspSource};
connect-src 'none';
```

`localResourceRoots` には以下のみを含める。

- 拡張 `media/`
- 対象 renderer root
- 必要時に限り、source document 文脈で許可された local image 参照 root

### 6.7 Error Reporter

関連要求: FR-020, FR-021, NFR-004

責務:

- 利用者向けメッセージ生成
- path 不正、manifest 不正、index.html 不在、trust 違反の識別

エラー分類:

- `RendererNotFound`
- `RendererPathInvalid`
- `RendererIndexMissing`
- `RendererManifestInvalid`
- `RendererBlockedByTrust`

## 7. 処理設計

### 7.1 既定プレビュー起動

関連要求: FR-012, FR-015, FR-016, AC-001

1. アクティブエディタの `document` を取得
2. 拡張子正規化
3. Trust Policy を適用した Renderer Registry で候補を解決
4. 先頭 renderer を選択
5. `PreviewRequest` を生成
6. Preview Session Manager が既存パネルを再利用または新規作成
7. WebView 準備完了後に `bootstrap` を送る

### 7.2 renderer 選択起動

関連要求: FR-013, AC-002, AC-003

1. アクティブファイルの候補 renderer 一覧を取得
2. QuickPick で選択
3. 選択 renderer を使って 7.1 と同じ経路で起動

### 7.3 standalone 起動

関連要求: FR-014, AC-004

1. 利用可能 renderer 一覧を収集
2. QuickPick で 1 件選択
3. `launchMode = "standalone"`、`sourceUri = undefined` で起動
4. payload の `savedTextContent` は `null`

### 7.4 手動再描画

関連要求: FR-018, FR-019, AC-005

1. 対象パネルの最新 `PreviewRequest` を取得
2. `launchMode = "file"` の場合のみ、現在の保存済みファイルを再読込
3. 新 payload を作成して `rerender` を送る
4. standalone は同じ payload を再送する

### 7.5 Restricted Mode

関連要求: FR-022, FR-023, AC-006

1. 起動前に `workspace.isTrusted` を確認
2. untrusted の場合は Trust Policy で候補を絞る
3. 候補ゼロなら trust 起因の説明メッセージを表示

### 7.6 異常時の利用者通知

関連要求: FR-020, FR-021, AC-008

通知文は次の要素を含む。

- 失敗種別
- 対象 renderer ID
- 対象 path
- 次の修正行動

例:

- `Renderer 'docs-navigator' was not opened because index.html is missing: <path>`
- `Renderer path is not valid in the current remote execution environment: <path>`

## 8. examples 設計

### 8.1 ディレクトリ契約

関連要求: FR-026, FR-027, AC-009

```text
examples/
  settings/
    workspace.settings.jsonc
  sources/
    handbook.md
    catalog.json
    sample.c
  renderers/
    by-extension/
      md/docs-navigator/
      json/rich-inspector/
      c/function-browser/
```

### 8.2 Markdown sample renderer

関連要求: FR-028, FR-032, AC-010, AC-015, AC-016

- 入力: Markdown 生テキスト
- 表示: 見出しごとのセクションカード
- UI: 左ナビゲーション、検索ボックス、source-relative document link の同一パネル遷移、local image 表示

### 8.3 JSON sample renderer

関連要求: FR-029, AC-011

- 入力: JSON オブジェクトまたは `items` 配列
- 表示: カード表示 + raw JSON 展開
- UI: 要素フィルタ、検索ボックス

### 8.4 C sample renderer

関連要求: FR-030, AC-012

- 入力: C ソース全文
- 表示: 関数単位のカード
- UI: 関数一覧、各カードの `details/summary` 展開

## 9. テスト設計

### 9.1 テストレイヤ

関連要求: NFR-007, NFR-008, FR-031, AC-013, AC-014

1. Extension host tests
   - 設定解決、renderer 優先順位、Trust 制御、コマンド登録、パネル再利用を検証する。

2. Renderer behavior tests
   - examples renderer の検索、フィルタ、ナビゲーション、折りたたみを検証する。

3. Packaging / contribution tests
   - command / configuration contribution と VSIX 内容方針を検証する。

### 9.2 推奨テストファイル

関連要求: AC-001 から AC-016

- `test/suite/configuration.test.ts`
  - FR-001 から FR-007
- `test/suite/rendererResolver.test.ts`
  - FR-005, FR-008 から FR-011, AC-001 から AC-003
- `test/suite/previewManager.test.ts`
  - FR-012 から FR-019, FR-032, AC-004, AC-005, AC-015, AC-016
- `test/suite/workspaceTrust.test.ts`
  - FR-022, FR-023, AC-006, AC-007
- `test/suite/examplesMarkdown.test.ts`
  - FR-028, FR-032, AC-010, AC-015, AC-016
- `test/suite/examplesJson.test.ts`
  - FR-029, AC-011
- `test/suite/examplesC.test.ts`
  - FR-030, AC-012

### 9.3 トレーサビリティコメント規約

関連要求: FR-031, NFR-009, AC-014

コードとテストの先頭または対象ブロック直前に、検索可能な Trace コメントを置く。

```ts
// Trace: FR-005, FR-012, AC-001
```

ルール:

- 省略形を使わない
- 1 行に収まらない場合は複数行へ分割してよい
- `FR-` と `AC-` は grep で検索できる文字列のまま残す

## 10. 未決事項

- Marketplace 表示名を `CustomViewer` のままにするか、機能説明寄りの名称へ変更するか
- WebView bootstrap bridge の renderer 側補助 API を `window.CustomViewerHost` として提供するか、DOM event だけにするか
- renderer behavior tests を Playwright にするか、軽量 DOM テストにするか