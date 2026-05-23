# CustomViewer 正式要求定義書

## 1. 文書情報

| 項目 | 内容 |
| --- | --- |
| 文書種別 | 正式要求定義書 |
| 版数 | 1.0 |
| 作成日 | 2026-05-23 |
| 対象プロダクト | CustomViewer |
| 対象リリース | MVP |
| 正本 | 本書 |
| 草案元 | docs/IDEA.md |

本書は docs/IDEA.md を正式要求定義へ昇格させた正本である。今後の設計、実装、レビューでは、本書を判断基準とし、アイディアの追記先としての docs/IDEA.md は補助資料として扱う。

## 2. 要求要約

CustomViewer は、VS Code 上でテキスト系ファイルを拡張子ごとに任意の HTML レンダラーへ関連付け、右側タブの WebView で読み取り専用プレビューできる Marketplace 公開前提の拡張機能である。

MVP では、明示マッピング方式と規約ベース探索方式の両方を正式サポートし、保存済みファイル内容のみをレンダラーへ渡す。レンダラーはユーザー管理下のフォルダとして扱い、厳しい WebView 制約、Workspace Trust 制御、同一実行環境側配置ルールを前提に安全性と再利用性を両立する。

## 3. 調査要約

### 3.1 公式仕様から確定した前提

- VS Code の Webview は完全な HTML ドキュメントを前提とし、ローカル資源は localResourceRoots と asWebviewUri による明示許可が必要である。
- Webview はインラインスクリプト禁止を前提とした厳格な Content Security Policy を採るべきであり、ファイル内容、パス、設定値の HTML 埋め込みはサニタイズが必要である。
- Workspace Trust の公式ガイドでは、ワークスペース由来の設定値やコード実行経路を持つ機能は Restricted Mode で制限すべきとされている。
- Remote Development の公式ガイドでは、Workspace Extension は Remote SSH、Dev Containers、WSL、Codespaces ではリモート側で動作しうるため、ファイルパス解決は「拡張が動いている側」を基準に設計する必要がある。
- 読み取り専用プレビューの MVP は WebviewPanel で成立し、Custom Editor 系 API は将来の Reopen With 体験や編集機能が必要になってから検討すればよい。

### 3.2 近接事例から得た差別化判断

- Markdown Preview Enhanced は Markdown 向けの高機能プレビュー拡張であり、同期、目次、数式、ダイアグラム、エクスポートなどを Markdown 特化で提供している。
- Data Preview は JSON、YAML、CSV、Excel など複数形式に対し、並べ替え、絞り込み、集計、チャートを含む形式特化ビューアを提供している。
- 既存の近接拡張は「特定形式向けの専用ビューア」であることが多く、CustomViewer の差別化軸は「拡張子ごとに任意の HTML レンダラーを差し替える汎用ホスト」である。

## 4. 背景と目的

### 4.1 背景

- Markdown、JSON、YAML などの閲覧体験は既存拡張でも一定の充実があるが、多くは特定形式に最適化されており、表示したい UI を任意に差し替える汎用的な仕組みは乏しい。
- 同じ拡張子でも、設定ファイル、ログ、技術文書、独自 DSL では見やすい UI が異なる。
- チームや個人が「この形式だけ見やすくしたい」と思っても、毎回専用拡張や別アプリを作るのは重い。

### 4.2 目的

- VS Code 上で、拡張子ごとに任意の HTML レンダラーを紐付けて読み取り専用プレビューできる共通ホストを提供する。
- レンダラーをワークスペース内外で再利用可能にし、プロジェクト横断で同じ閲覧 UI を使えるようにする。
- 形式ごとの専用拡張を乱立させず、1 つの拡張へ起動導線とセキュリティ境界を集約する。

## 5. 想定利用者と利害関係者

### 5.1 一次利用者

- JSON、Markdown、YAML、独自テキスト形式を日常的に閲覧する開発者
- 技術文書作成者
- 設定ファイルを扱う運用担当者
- 社内向けツール作者、内製拡張作者

### 5.2 二次利用者

- チーム内で共通 renderer パックを配布したい組織
- 形式別ビューアを小さく作りたい社内開発チーム

### 5.3 利害関係者

- プロダクトオーナー: Taogya
- 拡張機能利用者
- renderer 作者
- Marketplace 審査と公開後運用を担う保守者

## 6. 用語定義

| 用語 | 定義 |
| --- | --- |
| renderer | 1 つの HTML プレビュー UI を構成するフォルダ単位の成果物 |
| 明示マッピング方式 | 設定で拡張子と renderer パスを直接関連付ける方式 |
| 規約ベース探索方式 | rendererRoots 配下の規約ディレクトリ構造から renderer を自動発見する方式 |
| 単独起動 | 対象ファイルなしで renderer 自体を起動するモード |
| 正規化拡張子 | 先頭のドットを除去し、小文字化した拡張子文字列。例: .JSON -> json |
| 同一実行環境側配置 | renderer が、拡張機能の Extension Host が動作している側のファイルシステム上に存在すること |

## 7. スコープ

### 7.1 MVP の対象範囲

- 拡張子ごとの renderer 解決
- 明示マッピング方式
- 規約ベース探索方式
- アクティブファイル起点のプレビュー起動
- アクティブファイルに対する renderer 選択起動
- renderer 単独起動
- 複数 renderer 登録と優先順位管理
- 保存済みファイル内容のみを使う読み取り専用プレビュー
- 手動再描画
- ワークスペース信頼と WebView 制約を含むセキュリティ統制
- Local / Remote 環境での同一実行環境側配置ルール
- Markdown サンプル renderer における source-relative document link 起動と local image 表示
- examples 配下の renderer / source / settings サンプル提供
- 自動テストによる要求適合性確認
- 実装コードとテストコードへの要求 ID トレーサビリティ付与

### 7.2 MVP で対象外とする事項

- WebView から元ファイルを編集・保存する機能
- 任意のシェル実行や外部 CLI 呼び出しの renderer への開放
- ファイル保存、キー入力、ファイル監視による自動再描画
- Reopen With 前提の Custom Editor 統合
- 汎用標準 renderer 群の大量同梱
- スキーマ解析やデータモデル解析からの自動 UI 生成
- ノーコードアプリ基盤化
- renderer からの広範な VS Code API 呼び出し

### 7.3 将来拡張候補

- renderer 検証コマンド
- renderer テンプレート生成コマンド
- renderer.json による権限制御の拡張
- 限定的な renderer からホストへのメッセージ API
- Reopen With に近い統合体験

## 8. 制約付き前提

- 公開形態は Marketplace 配布を前提とする。
- プレビュー対象は保存済みファイル内容を正とする。未保存テキストは MVP では渡さない。
- 再描画は手動トリガーのみとし、保存契機・入力契機の自動更新は将来機能とする。
- renderer は常に Extension Host が動作する側に配置されなければならない。Remote 環境でローカルクライアント側の絶対パスを参照する設計は MVP 対象外とする。
- renderer は信頼済みのユーザー管理資産として扱うが、ワークスペース由来の renderer と設定は Workspace Trust により制限する。

## 9. 機能要求

### 9.1 設定と解決

| ID | 要求 | 備考 |
| --- | --- | --- |
| FR-001 | 拡張機能は、設定名前空間 customViewer 配下に少なくとも customViewer.extensionRendererMap と customViewer.rendererRoots を提供しなければならない。 | 本書時点で設定名前空間は確定事項とする。 |
| FR-002 | customViewer.extensionRendererMap は、正規化拡張子をキー、優先順 renderer 定義配列を値として受け付けなければならない。 | renderer 定義は id、path を必須、displayName を任意とする。 |
| FR-003 | customViewer.rendererRoots は、規約ベース探索を行うためのルートディレクトリ配列を受け付けなければならない。 | 探索順は設定配列順とする。 |
| FR-004 | 規約ベース探索のディレクトリ構造は by-extension/<extension>/<renderer-id>/index.html を正としなければならない。 | 例: by-extension/json/default/index.html |
| FR-005 | renderer 解決順は、明示マッピング方式を最優先とし、その後に rendererRoots を配列順で探索しなければならない。 | 明示設定が自動探索より強い。 |
| FR-006 | 設定上の path 文字列は、絶対パスまたは ${workspaceFolder} / ${workspaceFolder:<name>} 変数を用いたパスのみを正式サポートしなければならない。 | 曖昧な裸の相対パスは正式仕様に含めない。 |
| FR-007 | renderer パスは同一実行環境側配置を満たすものだけを有効としなければならない。 | Remote 実行中にクライアント側ローカル絶対パスを使う構成は無効。 |

### 9.2 renderer 契約

| ID | 要求 | 備考 |
| --- | --- | --- |
| FR-008 | 各 renderer フォルダは index.html を必須ファイルとして持たなければならない。 | HTML 断片ではなく完全な HTML 文書を前提とする。 |
| FR-009 | renderer フォルダは任意で renderer.json を持てるものとし、少なくとも contractVersion、id、displayName、description、supportedExtensions を定義できなければならない。 | contractVersion は将来互換性の起点とする。 |
| FR-010 | renderer.json がない場合、renderer-id またはフォルダ名を表示名解決の既定値として扱わなければならない。 | 明示マッピングの displayName があればそれを優先してよい。 |
| FR-011 | renderer で利用する CSS、JavaScript、画像などの資産は renderer フォルダ配下に同梱できなければならない。 | 資産参照は asWebviewUri 変換を前提とする。 |

### 9.3 起動導線と表示

| ID | 要求 | 備考 |
| --- | --- | --- |
| FR-012 | 拡張機能は、アクティブファイルに対して既定 renderer を使って右側タブへプレビューを開くコマンドまたはエディタタイトル導線を提供しなければならない。 | MVP の主導線。 |
| FR-013 | 拡張機能は、アクティブファイルに対して利用可能な renderer 一覧から 1 つを選んで起動できる導線を提供しなければならない。 | 非既定 renderer の発見性を担保する。 |
| FR-014 | 拡張機能は、コマンドパレットから対象ファイルなしで renderer 単独起動を行える導線を提供しなければならない。 | 単独起動時は launchMode を standalone とする。 |
| FR-015 | 同一ソースファイルと同一 renderer の組み合わせで既存パネルが開いている場合、既定動作はそのパネルを再利用して前面表示しなければならない。 | 無制限の重複タブ生成を避ける。 |

### 9.4 データ受け渡しと再描画

| ID | 要求 | 備考 |
| --- | --- | --- |
| FR-016 | アクティブファイル起動時、ホストは renderer へ少なくとも sourceUri、fileName、normalizedExtension、savedTextContent、launchMode を渡さなければならない。 | savedTextContent は最後に保存された内容とする。 |
| FR-017 | プレビューは MVP では読み取り専用でなければならない。 | 元ファイル編集は標準テキストエディタが正本。 |
| FR-018 | 既存プレビューに対して、手動再描画コマンドを提供しなければならない。 | 更新ボタンは必須ではなく、コマンド導線で足りる。 |
| FR-019 | MVP では、キー入力、保存、ファイル監視による自動再描画を行ってはならない。 | 表示位置の変化や再初期化の副作用を避ける。 |

### 9.5 異常系と信頼モデル

| ID | 要求 | 備考 |
| --- | --- | --- |
| FR-020 | 対応 renderer が見つからない場合、拡張機能はテキストエディタを置き換えず、原因が分かるメッセージを表示しなければならない。 | 例: 対応 renderer 未設定。 |
| FR-021 | index.html 不在、パス不正、資産参照不可、同一実行環境側配置違反などの異常は、原因と対象パスが分かる形で通知しなければならない。 | サイレント失敗を禁止する。 |
| FR-022 | 拡張機能は Workspace Trust を limited サポートで宣言し、Restricted Mode ではワークスペース設定由来の renderer 設定とワークスペース配下 renderer の実行を無効化しなければならない。 | restrictedConfigurations の対象に renderer 関連設定を含める。 |
| FR-023 | Restricted Mode でも、ユーザー設定由来であり、かつワークスペース外かつ同一実行環境側に存在する renderer は利用可能でなければならない。 | ユーザー管理資産の再利用を確保する。 |
| FR-024 | MVP では renderer からホストへの広範な特権 API を公開してはならない。 | ファイル編集、任意コマンド実行、シェル実行、任意ファイルアクセスは禁止し、source-relative link 起動と image 解決のような限定用途だけを許可対象とする。 |
| FR-025 | WebView は外部ネットワーク、インラインスクリプト、不要な外部資産読込を既定で許可してはならない。 | CSP と localResourceRoots を最小権限で構成する。 |

### 9.6 examples とトレーサビリティ

| ID | 要求 | 備考 |
| --- | --- | --- |
| FR-026 | リポジトリは examples 配下に、renderer サンプル、表示対象ソースサンプル、settings.json サンプルを提供しなければならない。 | MVP の動作確認と導入理解を兼ねる。 |
| FR-027 | settings サンプルは、Markdown、JSON、C 言語の 3 種類の renderer サンプルを解決できる構成でなければならない。 | `${workspaceFolder}` ベースの設定例を正とする。 |
| FR-028 | Markdown 用 renderer サンプルは、ナビゲーションバーと検索機能を提供しなければならない。 | 目次移動と本文検索の両方を確認できること。 |
| FR-029 | JSON 用 renderer サンプルは、リッチ表示、対象要素のフィルタ、検索機能を提供しなければならない。 | 配列要素またはオブジェクト要素を対象に絞り込めること。 |
| FR-030 | C 言語用 renderer サンプルは、関数一覧表示と、関数単位の折りたたみ展開表示を提供しなければならない。 | 関数ナビゲーションと本文確認を両立する。 |
| FR-031 | 実装コードおよび自動テストコードには、関連する要求 ID および受入条件 ID をコメントで明示しなければならない。 | 少なくとも FR-xxx、AC-xxx を検索可能な形で残す。 |
| FR-032 | Markdown 用 renderer サンプルは、sourceUri を基準にした source-relative document link の同一プレビュー遷移または fallback 起動と local image 表示を、ホスト媒介で提供できなければならない。 | 解決対象はアクティブ source document の文脈に限定し、現在の renderer で扱えない対象は fallback を許容する。 |

## 10. 非機能要求

| ID | 要求 |
| --- | --- |
| NFR-001 | 拡張機能は Marketplace 公開を前提に、ユーザー指定 renderer を扱う機能として説明可能なセキュリティ境界を持たなければならない。 |
| NFR-002 | 対応実行環境は VS Code Desktop を基本とし、Remote SSH、Dev Containers、WSL、Codespaces でも同一実行環境側配置ルールを満たす限り動作可能でなければならない。 |
| NFR-003 | ホスト実装はフォーマット非依存でなければならず、MVP の責務はファイル読み出し、renderer 解決、WebView 表示、最小限のデータ受け渡しに限定されなければならない。 |
| NFR-004 | すべてのエラーは利用者が次の修正行動を判断できる粒度で表示されなければならない。 |
| NFR-005 | 設定スキーマと renderer 契約は将来の後方互換性を考慮し、少なくとも設定キーと contractVersion を安定識別子として維持できなければならない。 |
| NFR-006 | 本リポジトリのライセンスは BSD 3-Clause とし、著作者表記は Taogya、年は 2026 としなければならない。 |
| NFR-007 | 要求仕様への適合確認には、自動テストを正式採用しなければならない。 |
| NFR-008 | 自動テストは、少なくとも renderer 解決、起動導線、手動再描画、examples の主要 UI 要件を非対話で検証できなければならない。 |
| NFR-009 | トレーサビリティ用コメントは grep 等で検索可能な単純形式でなければならない。 |

## 11. 受入条件

| ID | 条件 |
| --- | --- |
| AC-001 | customViewer.extensionRendererMap に json の既定 renderer を 1 つ設定した状態で JSON ファイルを開き、既定プレビュー導線を実行すると、右側タブに当該 renderer の WebView が開く。 |
| AC-002 | customViewer.rendererRoots に規約配置された md renderer を登録した状態で Markdown ファイルを開き、renderer 選択導線から対象 renderer を選ぶとプレビューが開く。 |
| AC-003 | 同一拡張子に複数 renderer が登録されているとき、既定導線は先頭 renderer を使い、選択導線では他 renderer を選べる。 |
| AC-004 | コマンドパレットから renderer 単独起動を選ぶと、入力ファイルがなくても WebView が開く。 |
| AC-005 | ファイルを未保存変更しただけではプレビュー内容は変化せず、保存後に手動再描画を実行したときにのみ更新される。 |
| AC-006 | Restricted Mode ではワークスペース設定やワークスペース配下 renderer による起動が拒否される一方、ユーザー設定由来の安全な renderer は利用できる。 |
| AC-007 | Remote 環境で renderer をリモート側に配置した場合は動作し、ローカルクライアント側絶対パスを指定した場合は同一実行環境側配置違反として拒否される。 |
| AC-008 | index.html が存在しない renderer を起動した場合、無反応ではなく、欠落ファイルと設定パスが分かるエラーが出る。 |
| AC-009 | examples/settings 配下の settings サンプルを適用すると、Markdown、JSON、C 言語の 3 種類のサンプル renderer を解決できる。 |
| AC-010 | Markdown サンプル renderer は、サンプル Markdown を表示した際にナビゲーションバーと検索 UI を提供し、検索結果に応じて表示更新できる。 |
| AC-011 | JSON サンプル renderer は、サンプル JSON を表示した際にリッチ表示、対象要素フィルタ、検索 UI を提供し、条件変更に応じて表示更新できる。 |
| AC-012 | C 言語サンプル renderer は、サンプル C ソースを表示した際に関数一覧を示し、各関数本体を折りたたみ展開できる。 |
| AC-013 | 自動テストは、少なくとも FR-005、FR-012 から FR-019、FR-028 から FR-030 の期待挙動を検証する。 |
| AC-014 | 実装コードとテストコードの双方で、関連する FR-xxx / AC-xxx コメントを検索できる。 |
| AC-015 | Markdown サンプル renderer は、サンプル Markdown に含まれる source-relative document link を選択した際、現在の renderer で扱える text target なら同一プレビューセッション内で表示更新し、対象外は VS Code エディタで開ける。 |
| AC-016 | Markdown サンプル renderer は、サンプル Markdown に含まれる source-relative image 参照を、解決可能な場合はプレビュー内に表示できる。 |

## 12. 設計への引き渡し事項

次の設計フェーズでは、少なくとも以下を確定させる。

- package.json の拡張 ID、表示名、コマンド ID
- settings schema の JSON Schema 詳細
- renderer.json の厳密スキーマ
- WebView 生成と再利用のライフサイクル
- Workspace Trust の restrictedConfigurations 対象
- CSP の具体値と許可対象資産
- Remote 環境判定とパス検証の実装方式
- テスト方針と受入条件との対応
- トレーサビリティ用コメント規約
- examples 配下のディレクトリ契約と各サンプルのデータ契約

## 13. 次段設計ドキュメント方針

現時点のプロジェクト規模では、次の会話で作成する設計書は docs/DESIGN.md の単一文書から開始する方針を推奨する。以下のいずれかに達した場合のみ docs/design 配下への分割を行う。

- 独立した設計対象が 3 つ以上に分かれ、1 文書で追跡しづらくなる場合
- renderer 契約、メッセージ契約、設定スキーマが長くなり、本文の可読性を壊す場合
- セキュリティ、Remote、運用手順など読み手の異なる情報を分けた方が保守しやすい場合

## 14. 参考設定例

### 14.1 明示マッピング方式

```json
{
  "customViewer.extensionRendererMap": {
    "json": [
      {
        "id": "json-explorer",
        "displayName": "JSON Explorer",
        "path": "${workspaceFolder}/.vscode/renderers/json-explorer"
      }
    ],
    "md": [
      {
        "id": "docs-navigator",
        "displayName": "Docs Navigator",
        "path": "/Users/example/.config/customviewer/renderers/docs-navigator"
      }
    ]
  }
}
```

### 14.2 規約ベース探索方式

```json
{
  "customViewer.rendererRoots": [
    "/Users/example/.config/customviewer/renderers",
    "${workspaceFolder}/.vscode/renderers"
  ]
}
```

規約配置例:

- /Users/example/.config/customviewer/renderers/by-extension/json/default/index.html
- /Users/example/.config/customviewer/renderers/by-extension/md/docs-navigator/index.html

### 14.3 renderer.json 例

```json
{
  "contractVersion": 1,
  "id": "json-explorer",
  "displayName": "JSON Explorer",
  "description": "Searchable read-only JSON preview",
  "supportedExtensions": ["json"]
}
```

## 15. 調査ソース

- VS Code Webview API Guide
- VS Code Custom Editor API Guide
- VS Code Workspace Trust Extension Guide
- VS Code Supporting Remote Development and GitHub Codespaces
- VS Code Marketplace: Markdown Preview Enhanced
- VS Code Marketplace: Data Preview