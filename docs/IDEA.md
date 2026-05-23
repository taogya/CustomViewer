# 拡張子別HTMLレンダラープレビュー

VS Code で Markdown、JSON、YAML などのテキストファイルを、拡張子ごとに紐づけた HTML レンダラーで見やすくプレビューする拡張機能のアイディアです。単なる表示ではなく、検索、フィルタ、セクションタブ、ナビゲーションバーなどを renderer 側で実装できる状態を目指します。

## このリポジトリが解決すること

- 課題: Markdown や JSON のプレビュー機能は多いが、特定フォーマット専用だったり、表示専用で検索や絞り込みが弱かったりすることが多い。
- 課題: 同じファイル形式でも、設定ファイル、ログ、ドキュメント、独自 DSL では見たい UI が違う。
- 課題: チームや個人が「この形式だけ見やすくしたい」と思っても、毎回専用拡張や別アプリを作るのは重い。
- 価値: 拡張子ごとに HTML ベースのレンダラーを差し替えられると、VS Code 上で用途別の見やすいビューを作れる。
- 価値: レンダラーフォルダをワークスペース外の共通ディレクトリにも置けると、複数プロジェクトで再利用しやすい。
- 価値: 共通の起動方法を 1 つの拡張へ集約することで、ファイル種別ごとに異なる拡張を覚えなくて済む。

## 想定ユーザー

- 最初に助けるユーザー: JSON、Markdown、YAML、独自テキスト形式を VS Code で日常的に読む開発者、技術文書作成者、設定ファイルを扱う運用担当者、社内ツール作者。
- 主なユースケース: 大きい JSON を検索・フィルタ付きで眺める、Markdown をセクションタブや目次付きで読む、独自形式のファイルを専用 UI で確認する。
- 二次ユーザー: チーム内で共通 renderer パックを配布したい組織、社内専用ビューアを小さく作りたい人。
- 要確認: 公開 Marketplace 向けの一般配布を狙うのか、社内利用を主対象にするのか。必要なセキュリティ設計と UX が変わる。

## 何を提供するか

### MVPで提供すること

- settings.json で 拡張子 -> レンダラー一覧 を明示定義できる仕組み。
- 各レンダラーはフォルダ単位で管理し、index.html を必須、CSS、JavaScript、画像などの同梱を許可する仕組み。
- レンダラーフォルダをワークスペース内だけでなく、ユーザーのローカルな共通ディレクトリからも参照できる仕組み。
- 現在開いているファイルの拡張子に対応する最優先レンダラーを、ショートカットキーまたはエディタタイトルのアクションから右側タブに WebView として開く仕組み。
- コマンドパレットから、設定済みの拡張子一覧とレンダラー名を選び、入力ファイルなしでレンダラーを単独起動できる仕組み。
- 1 つの拡張子に複数レンダラーを登録できる仕組み。通常起動では先頭を既定値として使う。
- 少なくともアクティブファイルの URI、拡張子、テキスト内容をレンダラーへ渡せる仕組み。
- プレビューは MVP では読み取り専用とし、元ファイル編集は通常のテキストエディタを正とする。

### 提案して追加したいこと

- 提案: index.html に加えて renderer.json を任意ファイルとして持てるようにし、表示名、説明、対応拡張子、必要権限を宣言できるようにする。renderer.json がない場合はフォルダ名を表示名として扱う。
- 提案: 明示マッピングに加えて、htmlRendererPreview.rendererRoots のような設定で renderer の探索ルートを指定し、規約パスから自動発見する省設定モードを検討する。たとえば renderer-roots/by-extension/json/default/index.html のような配置なら、個別マッピングなしでも json 拡張子の既定 renderer として解決できる形。
- 提案: ファイル保存時の自動リロードと、手動リロード操作を用意する。
- 提案: レンダラーのパス不正、index.html 不在、参照不可アセットなどを確認する「レンダラー検証」コマンドを用意する。
- 提案: 最小構成の renderer テンプレートを生成する補助コマンドを用意する。
- 提案: 将来の拡張として、レンダラーから「ファイルを開く」「行へジャンプする」などの限定的なメッセージ API を設ける。

## 何をしないか

- 最初の MVP では、WebView から元ファイルを直接編集・保存する機能は扱わない。
- 最初の MVP では、任意のシェル実行や外部 CLI 呼び出しをレンダラーへ開放しない。
- 最初の MVP では、すべてのファイル形式向けに高機能な標準レンダラー群を同梱しない。
- 最初の MVP では、スキーマや内容を解析して自動で最適な UI を生成する機能は扱わない。
- VS Code の通常エディタを全面的に置き換えることは目的にしない。

## 使い方の概観

1. ユーザーが HTML、CSS、JavaScript を含むレンダラーフォルダを用意する。
2. settings.json で、対象拡張子とレンダラーフォルダの対応を明示設定する、または rendererRoots 配下の規約パスへ配置する。
3. 対象ファイルを VS Code で開き、ショートカットキーまたはエディタタイトルのアクションからプレビューを起動する。
4. 右側の WebView タブに、対応レンダラーによるプレビューを表示する。
5. 必要に応じて、コマンドパレットからレンダラー単体を起動し、レンダラー内の独自 UI からファイル選択などを行う。

設定イメージ 1: 明示マッピング方式。キー名と相対パス解決規則は未確認です。

```json
{
  "htmlRendererPreview.extensionRendererMap": {
    "json": [
      {
        "label": "JSON Explorer",
        "path": "/Users/example/renderers/json-explorer"
      }
    ],
    "md": [
      {
        "label": "Docs Navigator",
        "path": ".vscode/renderers/docs-navigator"
      }
    ]
  }
}
```

設定イメージ 2: 規約ベース探索方式。個別マッピングを書かず、探索ルート配下の既定配置を参照する案です。

```json
{
  "htmlRendererPreview.rendererRoots": [
    "/Users/example/.config/html-renderer-preview/renderers",
    ".vscode/renderers"
  ]
}
```

規約パスの例:

- /Users/example/.config/html-renderer-preview/renderers/by-extension/json/default/index.html
- /Users/example/.config/html-renderer-preview/renderers/by-extension/md/docs-navigator/index.html

現時点案: 設定キーと規約パスの拡張子名は json のようなドットなし正規化名を使う。実ファイルの .json は内部で json に正規化して解決する。

## 前提環境

- VS Code デスクトップ版を前提候補とする。ワークスペース外のローカルディレクトリ参照を扱うため、VS Code for the Web は MVP 対象外の可能性が高い。
- 拡張機能本体は TypeScript と VS Code Extension API で実装する想定。
- MVP の表示方式は WebviewPanel が第一候補。将来的に Reopen With に近い体験が必要なら CustomReadonlyEditorProvider または CustomTextEditorProvider の検討余地がある。
- 要確認: 最低対応 VS Code バージョン。
- 要確認: Remote SSH、Dev Containers、WSL、Codespaces で「グローバルなレンダラーディレクトリ」をどう定義するか。
- 要確認: 明示マッピング方式を MVP の正とし、rendererRoots による規約探索は後段にするか。
- 要確認: ワークスペース信頼と、ユーザーが指定したレンダラー実行の許可モデル。

## 最短手順

1. JSON 向けの最小 renderer を 1 つ作り、index.html でファイル内容を表示できるようにする。
2. settings.json で json とその renderer フォルダを紐づける。
3. JSON ファイルを開き、右側タブへプレビュー表示できることを確認する。
4. 同じ json 拡張子に 2 個目の renderer を追加し、先頭 renderer が既定で起動することを確認する。
5. コマンドパレットから renderer 単体起動を行い、入力ファイルなしでも UI を開けることを確認する。

## リポジトリ構成

- README.md: リポジトリ全体の説明。
- 作りたいもの/拡張子別HTMLレンダラープレビュー/README.md: このアイディアの要求定義メモ。

## 既知の制約

### 技術制約

- VS Code の Webview は強力だが重く、通常 API で足りる場合は過剰になりうる。
- Webview で表示する HTML は完全な HTML ドキュメントである必要がある。
- ローカルファイルを Webview から読むには、許可したルートだけを localResourceRoots に入れ、必要なリソースを asWebviewUri で変換する必要がある。
- ワークスペース外のグローバル renderer ディレクトリを扱う場合、ローカル環境では実現余地があるが、Remote 環境ではパスの意味が変わるため設計が難しい。
- Webview は非表示化で状態を失うことがあり、状態維持には getState/setState または retainContextWhenHidden の設計が必要になる。後者はメモリ負荷が高い。
- 読み取り専用プレビューは WebviewPanel で始めやすいが、将来編集まで踏み込むと CustomTextEditorProvider など別の API 選定が必要になる。
- 複数 renderer と単独起動モードを両立するには、拡張本体と renderer 間のメッセージ契約を早めに固定する必要がある。

### セキュリティ制約

- ユーザー指定の HTML と JavaScript を読み込む設計は、実質的に「任意 UI コードを VS Code 内で動かす」ことに近く、信頼モデルを明確にしないと危険。
- ファイル内容、ファイルパス、設定値を HTML に埋め込む際はサニタイズが必要。
- Content Security Policy を厳しく設定し、インラインスクリプトや不要な外部読込を避ける必要がある。
- global renderer を許可すると、チーム共有しやすい反面、サプライチェーン的な混入リスクも上がる。
- MVP では renderer に広い権限を与えず、ファイル読込や行ジャンプなども明示的な限定 API に留めた方が安全。

### UX・運用制約

- 複数 renderer を 1 拡張子へぶら下げる場合、先頭優先だけだと他 renderer の発見性が落ちる可能性がある。
- コマンドパレットに表示する renderer 名は、フォルダ名だけでは分かりにくい場合があるため、別名定義手段が欲しくなる。
- 未保存変更をプレビューへどう反映するかは要確認。保存済み内容を使うか、エディタ上の未保存テキストを使うかで挙動が変わる。
- renderer と対象ファイルの両方を監視して自動再読込する場合、監視数や更新頻度が増えるとパフォーマンスへ響く可能性がある。

### ライセンス・配布制約

- renderer 内で利用する CSS フレームワーク、UI ライブラリ、画像、アイコンは個別にライセンス確認が必要。
- 既存の特定拡張や SaaS の UI をそのまま模倣すると、著作権やトレードドレス上の懸念が出る可能性がある。
- LICENSE ファイルはこのリポジトリで確認できていないため、リポジトリ自体のライセンスは未確認。

### 知財・特許リスクの要確認事項

- Google Patents の広いキーワード検索では、document preview、filter、sidebar navigation、custom preview editor 周辺に多数の公開特許・出願が見られる。
- document preview filter sidebar navigation 周辺では Apple、Relativity、Palantir、Wix などの関連結果が見え、プレビュー UI、リンクパネル、編集を伴うプレビュー、動的 UI 構築の領域は混み合っている可能性がある。
- custom file preview editor html navigation 周辺でも 2 万件規模の結果が見えるため、広く一般化された「プレビュー UI」では差別化よりも実装の具体性と回避設計が重要になる。
- 比較的リスクを下げやすいのは、ユーザー作成の renderer フォルダを拡張子へ紐づけ、読み取り専用で表示する MVP。逆に、データモデルから自動 UI 生成する機能、編集機能、ノーコードアプリ生成に近づくほど追加調査が必要。
- 法的な侵害判断は未実施。公開前や商用化前には、対象国を絞った追加調査が必要。

## 市場調査メモ

### 競合・近接事例

- VS Code 組み込みの Markdown Preview: Markdown の横並びプレビューという基本体験は既にある。
- Markdown Preview Enhanced: サイドプレビュー、豊富な拡張機能、キーバインド、ドキュメント用途に強い。
- Data Preview: JSON、YAML、CSV、Excel などを表形式で並べ、ソート、フィルタ、チャート、エディタタイトルやコンテキストメニューからの起動を提供している。
- 近い代替は多くが「特定形式に特化した viewer」であり、拡張子と任意 HTML renderer のマッピングを汎用ホストとして扱う発想は比較的すき間がある。

### 代替手段

- ファイル形式ごとに既存の VS Code 拡張を入れる。
- ブラウザやローカル Web アプリへファイルを渡して閲覧する。
- 各フォーマット向けに専用の custom editor を個別実装する。
- VS Code の外で社内専用 viewer アプリを作る。

### 実現性

- VS Code の公式ドキュメントでは、Webview や Custom Editor を使って JSON、XML、CSV などの代替表示や専用 UI を実装できると明記されている。
- 右側タブのプレビュー起動は WebviewPanel と相性がよい。
- localResourceRoots を追加すれば、ワークスペース外のローカル renderer ディレクトリを扱える余地があるが、制限は厳しく設計する必要がある。
- rendererRoots による規約探索を入れる場合、優先順位を明示マッピング、ワークスペース内 root、グローバル root のどれにするか決めないと挙動が分かりにくい。
- MVP を読み取り専用に絞るなら、保存・undo・redo を抱え込まずに始められる。

### MVP判断

- まずはテキスト系ファイルの読み取り専用プレビューに絞る。
- 起動導線は 2 本に限定する。1 つはアクティブファイル向けプレビュー、もう 1 つは renderer 単独起動。
- renderer 契約は小さく保つ。必須は index.html、追加情報は任意の renderer.json に分離する。
- 設定方式は、最初は明示マッピングを優先し、規約探索は設定量を減らしたくなった段階で追加検討する。
- 対応環境は、まずローカルの VS Code デスクトップ版を優先する。
- 編集機能、Remote 環境対応、custom editor としての本格統合は後段に回す。

### 差別化の仮説

- フォーマットごとに別拡張を作るのではなく、renderer ホストを 1 つ作る点。
- 検索やフィルタを「拡張本体の機能」ではなく「renderer が自由に持つ UI」として扱う点。
- renderer を共通ディレクトリへ置いて、複数プロジェクトで再利用できる点。
- renderer 単独起動を許すことで、ファイル起点だけでなく renderer 起点のワークフローも持てる点。

### 調査ソース

- VS Code Webview API ドキュメント。
- VS Code Custom Editor API ドキュメント。
- VS Code Marketplace の Markdown Preview Enhanced。
- VS Code Marketplace の Data Preview。
- Google Patents の関連キーワード検索。

## ロードマップ

- Phase 0: 設定スキーマ、renderer の信頼モデル、ワークスペース内外のパス解決方針を決める。
- Phase 1: 読み取り専用の右側プレビュー、複数 renderer の先頭優先、renderer 単独起動を実装する。
- Phase 2: 自動リロード、renderer.json、テンプレート生成、renderer 検証コマンドを追加する。
- Phase 3: renderer 切り替え UI、共通 renderer 管理 UX、Remote 環境での扱い方を整理する。
- Phase 4: 必要なら Reopen With 的な統合や、限定的な双方向 API を検討する。
- 現時点で予定なし: フル WYSIWYG 編集、任意コマンド実行、汎用ノーコードアプリ基盤化。

## 次にユーザーへ確認したいこと

- グローバル renderer ディレクトリは、任意の絶対パス指定を許したいのか、拡張側の管理ディレクトリも併用したいのか。
- 明示マッピングと rendererRoots による規約探索のどちらを MVP の主方式にしたいのか。
- renderer 単独起動は、WebView として index.html を開く想定でよいか。それとも物理ファイルとして index.html 自体をエディタで開きたいのか。
- 未保存変更があるときのプレビュー対象は、保存済みファイル内容か、エディタ上の最新テキストか。
- renderer から将来的に「別ファイルを開く」「特定行へ移動する」程度の VS Code 操作を呼びたいか。
- 最初に強く対応したい拡張子は何か。json、md、yaml、csv、独自拡張子で優先順位がほしい。
- 公開 Marketplace を前提にするか、まずは自分専用または社内専用ツールとして割り切るか。
- Reopen With に近い custom editor 体験を MVP に入れたいか、後回しでよいか。

## ライセンス

未確認: このリポジトリに LICENSE ファイルは確認できていません。