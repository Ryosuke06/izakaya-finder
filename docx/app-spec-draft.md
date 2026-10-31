# Izakaya Finder 仕様書（下書き）

- ドキュメント版: v0.2-draft
- 最終更新日: 2026-10-31
- 作成日: 2026-02-21
- 対象リポジトリ: `izakaya-finder`

## 0. 最新の構成決定（2026-10-31）

Next.jsを外し、Vite＋React、Go API、Node.js AIサービスのモノレポへ移行する。これは設計決定であり、移行実装はまだ行っていない。以下の既存パスは移行前の実装を指す。旧方針と矛盾する場合は本節を優先する。

### 変更の経緯

Next.jsでAIの応答を待つ構成について、TTL・実行時間制限に関係するエラーが発生する懸念があると指摘されたことを背景に、バックエンドを独立させる判断をした。実際にエラーが発生したという記録ではない。「TTL」が具体的にどの制限を指すか、どの実行・配信環境で制限を受けるかは未確認であり、Next.js自体に一律の制限があるとは断定しない。

Goへ分離するだけでタイムアウトを解消できるとは扱わない。GoからAIサービスへの通信、外部API、プロキシを含むタイムアウトとキャンセルを設計する。長時間処理を同期HTTPで待つか、検索IDを返して非同期処理するかは、移行時の検討事項とする。

### 採用する構成

```text
izakaya-finder/
├ apps/
│  ├ web/             Vite＋React
│  ├ backend/         Go API
│  └ ai-service/      TypeScript／Node.jsのAIサービス
├ compose.yaml        開発用DB
├ Taskfile.yaml       全体の開発コマンド
├ pnpm-workspace.yaml
├ package.json
└ docx/
```

YAMLファイルの拡張子は `.yaml` に統一する。`package.json` や `tsconfig.json` など、ツールが要求するJSONファイルはそのまま使用する。Taskfileによる起動・確認・テストの集約を目指すが、具体的なタスク定義は未実装。

### 通信と責務

```text
React → Go API → Node.js AIサービス → Google Places／Gemini
           └ PostgreSQLへの保存・取得
```

- フロントはフォーム入力の保持・送信、送信中・エラー・結果表示に絞る。業務上の条件解釈や採点は行わず、Node.js AIサービスやDBを直接呼ばない。
- Go APIをフロント向けの唯一のバックエンド入口にする。既存のServer ActionとAPI Routeによる入口の重複は移行時に解消する。
- HandlerはHTTPリクエストDTOの読み取り、形式検証、入力値の変換、ユースケース入力への整形とHTTPレスポンス作成を担当する。
- Application／Use caseは検索の進行、AIサービス呼び出し、保存を調整する。
- Domainは人数・予算・必須条件などの業務ルールと最終的な推薦可否を担う。業務判断をHandlerへ集中させない。
- InfrastructureはAIサービスへのHTTP通信とDBアクセスを担当する。
- Node.js AIサービスは既存のTypeScript／LangGraphを活かし、Google Placesによる候補取得、Geminiによる評価・要約、根拠情報の返却を担う。Go側でAI出力を検証してから利用する。
- Node.jsはフロント開発時のVite実行にも使うが、ブラウザ上のReactとは別の実行環境である。Go APIとAIサービスは別プロセスとして起動し、同一PCで開発できる。
- APIキーとDB接続情報はサーバー側に置く。DB操作の責務はGoへ移す方針とし、既存Prismaのデータ・スキーマの移行とGo側のDBライブラリ選定は未決定。

### 移行順と確認事項

1. フロント→Go、Go→AIサービスのリクエスト・レスポンス・エラー契約を決める。
2. タイムアウト・キャンセル・同期／非同期実行と結果取得方法を決める。
3. GoのHandler／Use case／Domain／InfrastructureとDBアクセス方針を設計する。
4. AI処理をNext.jsから独立させ、`apps/ai-service/` へ移す。
5. Reactのフォーム・結果画面を `apps/web/` へ移し、Go APIへ接続する。
6. `Taskfile.yaml` に開発コマンドを集約し、正常系・入力不正・AI失敗・タイムアウト・結果取得を確認する。
7. 動作確認後にNext.jsのコードと依存関係を除去し、ドキュメントを実装と突合する。

認証、駅サジェスト、根拠収集とハード条件ゲートの要件は維持する。Next.js固有のServer Component、Route Handler、AI SDK `streamText` を前提とした旧表示方式は採用を確定していない。進捗通知方式はGo APIとの契約に合わせて再設計する。

## 1. 目的

ユーザーの希望条件（場所、人数、雰囲気、飲み放題可否、ビール必須など）をもとに、居酒屋候補を収集・評価し、理由付きでおすすめ順に提示する。

## 2. スコープ

### 2.1 対象

- 居酒屋候補の入力条件定義
- 候補データの保持
- ランキング結果の保持
- 要約文の生成
- 将来的な LLM/外部API連携の基盤

### 2.2 非対象（現時点）

- 本番向け UI（現状は Next.js 初期テンプレート）
- 完成済み API エンドポイント
- 認証・課金・管理画面

## 3. 想定ユーザー

- 飲み会幹事
- 少人数で店探しをしたい個人
- 条件付きで店を絞り込みたいユーザー

## 4. 用語

- Candidate: 検索で得られた店舗候補
- RecommendationItem: 評価後の推薦結果
- SearchState: 検索処理全体の状態

## 5. 機能要件（ドラフト）

### 5.0 スキーマ役割整理（LangGraph）

- `IzakayaSearchRequestSchema`
  - ユーザー入力（検索条件）を表すスキーマ
  - `SearchState.request` の型として利用する
- `CandidateSchema`
  - 候補店舗1件を表すスキーマ
  - `SearchState.candidates` の配列要素として利用する
- `RecommendationItemSchema`
  - 推薦結果1件を表すスキーマ
  - `SearchState.ranked` の配列要素として利用する
- `SearchStateSchema`
  - LangGraph 全体で受け渡す状態スキーマ
  - `request`, `candidates`, `ranked`, `summary`, `traceId`, `traceUrl` を含む

#### Node return の考え方

- 各ノードは `SearchState` 全体を受け取る
- 各ノードの return は「state 全体」ではなく「更新したいキーのみ」を返す
  - `fetchCandidates` は `candidates` を更新
  - `rankCandidates` は `ranked` を更新
  - `buildSummary` は `summary` を更新
- これにより、段階処理（候補収集→順位付け→要約）を安全に分離できる

### 5.1 入力条件

`IzakayaSearchRequestSchema`（`ai-api/schemas/izakaya.ts`）

- `area`: エリア指定（最優先）
  - `mode`: `current_location | station_input`
  - `station`: 駅名（`station_input` のとき必須）
  - デフォルトは現在地。位置情報が使えない場合は駅名入力へフォールバック
  - 駅入力はサジェスト対応（例: 新宿 / 渋谷 / 池袋）
- `people`: 人数
  - `1〜50` の整数で指定
- `budget`: 予算
  - `up_to_3000 | up_to_5000 | up_to_8000 | unspecified`
- `allYouCanDrink`: 飲み放題重視フラグ（既存仕様を維持、既定 `false`）
- `beerRequired`: ビール必須フラグ（既存仕様を維持、既定 `false`）
- `moodTags`: 雰囲気（複数選択）
  - `waiwai | calm | date | colleagues | solo | with_boss`
- `preferences`: こだわり自由記述（任意）
  - 例: 「禁煙で個室希望。終電後も営業している店」

### 5.1.1 UI操作仕様（入力）

- 画面下固定ボタン: 「この条件で探す」
- 条件が少ない場合は「おすすめで探す」導線を表示可能にする
- 現在地が許可されない場合は、駅名入力UIへ自動遷移する

### 5.2 候補データ保持

`Candidate`（`ai-api/graphs/izakayaSearchGraph.ts`）

- 基本情報: `placeId`, `name`, `address`, `lat`, `lng`
- 補助情報: `rating`, `userRatingsTotal`, `priceLevel`, `website`, `googleMapsUrl`, `editorialSummary`
- 口コミ: `reviewsText[]`

### 5.3 推薦結果保持

`RecommendationItem`（`ai-api/graphs/izakayaSearchGraph.ts`）

- `score` による順位付け
- `reasons[]` による説明
- `evidence` による条件一致根拠（飲み放題/ビール）
- `meta` に店舗メタ情報を保持

### 5.4 処理状態

`SearchState`（`ai-api/graphs/izakayaSearchGraph.ts`）

- `request`, `candidates`, `ranked`, `summary`
- トレーシング情報: `traceId`, `traceUrl`

## 6. 処理フロー（目標）

1. 入力を `zod` で検証
2. 条件に基づいて候補店舗を収集
3. 候補をスコアリング
4. 上位候補を理由付きで整形
5. 全体要約を生成
6. 結果を JSON で返却

## 7. API 仕様（案）

### 7.1 エンドポイント

- `POST /api/izakaya/search`

### 7.2 リクエスト例

```json
{
  "area": {
    "mode": "station_input",
    "station": "渋谷"
  },
  "people": 4,
  "budget": "up_to_5000",
  "moodTags": ["waiwai", "colleagues"],
  "preferences": "禁煙で個室希望",
  "allYouCanDrink": true,
  "beerRequired": false
}
```

### 7.3 レスポンス例

```json
{
  "request": {
    "area": {
      "mode": "station_input",
      "station": "渋谷"
    },
    "people": 4,
    "budget": "up_to_5000",
    "moodTags": ["waiwai", "colleagues"],
    "allYouCanDrink": true,
    "beerRequired": false
  },
  "candidates": [],
  "ranked": [
    {
      "placeId": "abc",
      "name": "居酒屋A",
      "address": "東京都...",
      "score": 87,
      "reasons": ["飲み放題プランあり", "レビュー評価が高い"],
      "evidence": {
        "allYouCanDrinkHit": "飲み放題コースあり"
      },
      "meta": {
        "rating": 4.2,
        "userRatingsTotal": 530,
        "priceLevel": 2,
        "googleMapsUrl": "https://..."
      }
    }
  ],
  "summary": "4名利用に適した、飲み放題対応の候補を優先しました。"
}
```

### 7.4 結果表示と進捗通知（移行先）

ReactがGo APIへ入力を送り、Go APIが検索処理と保存・取得を担当する。結果はReactで表示する。検索ID、状態、結果取得APIの形式、および同期／非同期実行・進捗通知方式は第0節の移行手順で決定する。Server Actions、Server Components、Next.js Route Handlerを使用する旧案は撤回する。

第7.1〜7.3節のURLとJSONは旧APIの参考案であり、Go APIの確定済み契約ではない。

## 8. 非機能要件（ドラフト）

- 型安全: TypeScript + `zod`
- 観測性: `traceId`, `traceUrl` を保持可能にする
- 保守性: LangGraph state を中心に責務分離
- パフォーマンス: 候補収集と評価の段階を分け、将来並列化可能な構造にする

## 9. 技術スタック

- 移行前: Next.js／React／TypeScript、LangGraph／Gemini／Google Places、Zod、Prisma／PostgreSQL
- 移行先: Vite＋React、Go API、TypeScript／Node.js AIサービス、LangGraph／Gemini／Google Places、PostgreSQL
- 観測性: Langfuseを継続検討。GoとAIサービスをまたぐ追跡方法は未設計
- Go側のDBライブラリ、HTTPルーター、フロントのルーター、進捗通知方式は未決定

## 10. リポジトリ構成方針

第0節の `apps/web/`、`apps/backend/`、`apps/ai-service/` のモノレポ構成を採用する。従来の「モノレポ化は将来検討」「Goは駅設定のみを担当」という方針を変更し、Goが検索APIを含むバックエンドの入口を担う。

`pnpm-workspace.yaml` はJavaScript／TypeScript側のワークスペースを管理し、GoはGo Modulesで依存関係を管理する。全体の開発操作は `Taskfile.yaml` へ集約する。共通パッケージは必要になった段階で検討し、今回の確定構成には追加しない。

## 11. 移行前の実装状況と検索要件

第11.1〜11.3節は旧実装時点の記録を含む。2026-10-31のコード確認ではGoogle Places接続、結果カード・要約表示、未存在IDの404は実装済み。移行完了を意味しない。第11.4〜11.6節の検索要件は移行後も維持する。

### 11.1 実装済み

- 入力スキーマ定義（`ai-api/schemas/izakaya.ts`）
- 検索状態/型定義（`ai-api/graphs/izakayaSearchGraph.ts`）
- SearchGraph 本体の接続
  - `START -> fetchCandidates -> rankCandidates -> buildSummary -> END`
- 候補収集ノード（`ai-api/graphs/nodes/fetchCandidatesNode.ts`）
  - `SearchState.request` をもとに LLM へ候補収集を依頼
  - `Candidate[]` を `zod` で検証して返却
- ランキングノード（`ai-api/graphs/nodes/rankCandidatesNode.ts`）
  - `request` と `candidates` をもとに LLM へ順位付けを依頼
  - `RecommendationItem[]` を `zod` で検証して返却
- 要約ノード（`ai-api/graphs/nodes/buildSummaryNode.ts`）
  - `request` と `ranked` をもとに LLM へ要約生成を依頼
  - `{ summary: string }` を返却
- API Route（`src/app/api/izakaya/search/route.ts`）
  - `req.json()` を `IzakayaSearchRequestSchema` で検証
  - `createInitialSearchState(...)` を生成して `graph.invoke(...)` を実行
  - 成功時は Graph の最終 state を JSON 返却
  - バリデーションエラーは `400`、その他は `500`
- Server Action / server usecase の責務分離
  - `src/app/_actions/izakayaSearch.ts`
    - フォーム送信の入口として `createIzakayaFromForm(...)` を呼び、作成済み検索IDへ redirect
  - `src/app/lib/server/izakayaSearch/formSchema.ts`
    - `FormData` をフォーム入力スキーマで検証
    - `z.enum(["true", "false"]).transform(...)` で boolean へ変換
    - `IzakayaSearchRequestSchema` で内部検索リクエストとして最終検証
  - `src/app/lib/server/izakayaSearch/createSearch.ts`
    - Graph 実行と DB 保存をまとめる検索作成ユースケース
  - `src/app/lib/server/izakayaSearch/searchRepository.ts`
    - Prisma による `Search` 保存と取得の入口
- 結果表示ページの初期実装
  - `src/app/results/[id]/page.tsx`
    - URL の `id` を取得
    - `findSearchResultById(id)` で保存済み検索結果を取得
    - `ranked` を走査し、現状は各候補の評価値と Web サイト URL だけを仮表示する
  - `src/app/results/[id]/components/result_card/index.tsx`
    - 推薦結果カードの雛形を追加済みだが、描画・ページへの統合は未実装
- Go backend 方針（`backend/`）
  - `GET /health`
  - `GET /stations/suggestions?q=渋`
  - `GET /users/me/stations`
  - `POST /users/me/stations`
  - 初期実装案は標準ライブラリのみで、ユーザー駅設定はインメモリ保持
  - 現時点では方針整理段階であり、実ファイルは未追加
- Graph 関連の TypeScript 型チェック
  - `pnpm -s tsc --noEmit` 上、Graph 関連では追加エラーなし
  - 残件は `sample.ts` の別件エラーのみ

### 11.2 未実装・要修正

- API Route の疎通確認
- UI 画面
  - `/results/[id]` は評価値と Web サイト URL の仮表示まで実装済み
  - `summary`、店舗名、住所、理由、スコア、リンクを含む一覧表示は未実装
  - `findSearchResultById` は `SearchStateSchema.parse(...)` の結果を返却済み
  - 存在しない `Search.id` の扱いは `throw new Error(...)` ではなく `notFound()` へ寄せる
- Langfuse 連携の最小完成
  - `src/app/api/izakaya/search/route.ts` には Langfuse callback 呼び出しがある
  - ただし、環境変数未設定時の扱い、命名 typo、`traceId` / `traceUrl` の state 反映は未整理
  - 現状は「未着手」ではなく「途中実装」として扱う
- Cognito JWT 検証
- Go backend の永続化（DB）
- スコアリング/候補抽出の精度改善

### 11.3 API Route 疎通後の確認観点

- `POST /api/izakaya/search` の疎通後は、返却 JSON の内容を以下の観点で確認する
  - `candidates` が 5〜10 件程度返っているか
  - `ranked` が `score` 順に並んでいるか
  - `reasons` が入力条件に合った説明になっているか
  - `summary` が自然な日本語で、入力条件に触れているか
- 特に店舗の実在性を確認する
  - 現状の `fetchCandidates` は LLM による候補生成のため、店名・住所・Google Maps URL の実在保証が弱い
  - 次の改善候補として、`fetchCandidates` を Google Places API などの実データ取得へ寄せる

### 11.4 Google Places による候補取得方針（2026-08-01）

- 駅名入力から居酒屋候補を取得する初期実装では、Google Places API の Text Search (New) を使用する
  - 検索クエリは「`{駅名}駅 居酒屋`」を基本とする
  - Google Places は実在する候補店舗の収集を担当し、ユーザーの詳細条件との整合性評価は後段へ分離する
- Nearby Search (New) は現時点では使用しない
  - Nearby Search には、中心座標と半径を指定して「半径何 m 以内」を厳密に絞り込める利点がある
  - 現在の要件は「駅周辺から 5〜10 件程度の候補を取得すること」であり、厳密な半径指定を必要としていない
  - Text Search で駅名と居酒屋カテゴリを同時に検索できるため、駅の緯度・経度を取得してから Nearby Search を呼ぶ追加処理は、現段階では設けない
- 以下の要件が追加された場合は、Nearby Search の導入を再検討する
  - 駅から半径 500 m 以内など、検索範囲を厳密に保証する
  - 現在地を中心に候補を検索する
  - 距離順の候補表示や、検索範囲の明示が必要になる

### 11.5 候補取得・根拠検証フロー（2026-08-01）

推薦の不変条件は「再検索時にソフト条件を検索語から外すことはあっても、ハード条件を満たさない店舗は推薦しない」とする。

Tavilyによる候補ごとの根拠収集には、必ず上限を設ける。初期値は次のとおりとし、`select_verification_targets`はこの件数を超える候補を`research_candidate`へ送らない。

```ts
const MAX_TAVILY_TARGETS = 3;
```

これにより、検索リクエストごとの待ち時間、API利用量、並列実行数を予測可能に保つ。上限超過の候補はGoogleの構造化データによる一次判定までに留め、Tavily検証対象の優先順位は未確認のハード条件、自由記述との関連性、Google評価を基準に決める。

```mermaid
flowchart TD
    START([開始]) --> PLAN["1. Google検索計画<br/>plan_places_search"]
    PLAN --> GOOGLE["2. Google Places Text Search<br/>fetch_google_candidates"]
    GOOGLE --> NORMALIZE["3. 正規化・重複排除<br/>normalize_candidates"]
    NORMALIZE --> SCREEN["4. 既知のハード不適合を除外<br/>screen_known_hard_failures"]

    SCREEN -->|候補なし・初回かつソフト検索語あり| RETRY["5. ソフト検索語だけ除外<br/>retry_without_soft_terms"]
    RETRY --> PLAN
    SCREEN -->|候補なし・再試行済み または除外できるソフト語なし| NORESULT["候補なし回答<br/>build_no_result"]
    NORESULT --> END([終了])

    SCREEN -->|候補あり| SELECT["6. 検証対象を選定<br/>select_verification_targets"]

    subgraph FANOUT["Tavily検証（最大3件・Sendで並列）"]
        RESEARCH["7. 根拠を収集<br/>research_candidate"]
        JUDGE["8. 根拠を判定<br/>judge_evidence"]
        RESEARCH --> JUDGE
    end

    SELECT -->|候補ごとにSend| RESEARCH
    JUDGE --> MERGE["検証結果を集約<br/>state reducer"]
    MERGE --> GATE["9. 最終ハード条件ゲート<br/>apply_final_hard_gate"]
    GATE -->|推薦可能な候補あり| RANK["10. ソフト条件で順位付け<br/>rank_candidates"]
    GATE -->|すべて不適合 または未確認| NORESULT
    RANK --> VALIDATE["11. 出力検証・整形<br/>validate_and_format"]
    VALIDATE --> END
```

構造化されたUI入力は、LLMによる `parse_intent` で再解析しない。`area`、`people`、`budget`、`allYouCanDrink`、`beerRequired` は入力時点でハード条件として扱い、`moodTags` は原則ソフト条件とする。`preferences` がある場合だけ、必要に応じて自由記述からハード候補・ソフト候補・判断不能条件を補助的に抽出する。

#### Node の責務

| Node | 役割 | 守るルール |
| --- | --- | --- |
| `plan_places_search` | 構造化入力からGoogle Text Searchのクエリ、店舗タイプ、FieldMaskを決める | ハード条件を記録し、検索クエリへの採用有無と最終条件判定を混同しない |
| `fetch_google_candidates` | Google Text Searchで実在候補を取得する | `placeId`を以後の店舗識別子として保持する |
| `normalize_candidates` | `Candidate`へ変換し、`placeId`重複、閉業・移転済み候補を整理する | 同一店舗を二重評価しない |
| `screen_known_hard_failures` | Googleの構造化データで明確にハード不適合な候補だけを除外する | 情報不足は`unknown`として残し、この時点では除外しない |
| `retry_without_soft_terms` | 初回検索に含めたソフト検索語だけを除外して再検索する | 駅、人数、予算、飲み放題などのハード条件は外さず、再試行は1回までとする |
| `build_no_result` | 推薦可能な候補がないことを返す | ハード条件を緩和した店舗を代替推薦として混ぜない |
| `select_verification_targets` | Tavilyで検証する候補を `MAX_TAVILY_TARGETS = 3` 件までに絞る | ハード条件が`unknown`の候補や自由記述に関係する候補を優先する。上限超過の候補は`research_candidate`へ送らない |
| `research_candidate` | Tavilyで公式サイト、予約サイト、メニューを調査する | `店舗名 + 住所 + 未確認条件`で検索し、根拠URLと抜粋を保存する |
| `judge_evidence` | 収集した根拠から条件ごとに`yes / no / unknown`を判定する | 根拠URLなしで`yes`にせず、曖昧な情報は`unknown`にする |
| `apply_final_hard_gate` | ハード条件を最終確認する | 全ハード条件が`yes`の候補だけを推薦対象にし、`no`は除外、`unknown`は通常推薦に入れない |
| `rank_candidates` | 通過候補をソフト条件、評価、価格、根拠の強さで並び替える | ハード条件で落ちた候補を採点しない |
| `validate_and_format` | APIレスポンスに整形し、安全性を検証する | `placeId`なし、根拠なしの断定、ハード不適合な候補を出力しない |

`state reducer` は外部APIやLLMを呼ぶNodeではない。`Send`で並列実行された候補ごとの検証結果を `verificationResults[]` に追加結合するstate更新規則である。TypeScriptのLangGraphでも、`Send`を使って候補ごとのMap-Reduce型検証を構成できる。

#### 最終ハード条件の扱い

- `yes`: 根拠により条件を満たすと確認できた。推薦対象にできる。
- `no`: 根拠により条件を満たさないと確認できた。除外する。
- `unknown`: 情報が不足している。通常の推薦一覧には入れず、必要なら「要確認候補」として別に返す。

### 11.6 Google Places の `includedType` 方針（2026-08-08）

- 初期実装のGoogle Places Text Searchでは、`includedType`を指定しない
  - 基本検索語の「`{駅名}駅 居酒屋`」で、居酒屋を中心に候補を取得する
  - 飲酒可能なレストランやバーも候補として扱えるよう、`japanese_izakaya_restaurant`など単一の店舗Typeで候補を狭めない
- `includedType`を指定しないことは、ハード条件の緩和ではない
  - 飲み放題、ビール、人数、予算などのハード条件は、Googleの構造化データ・Tavilyの根拠・最終ハード条件ゲートで別途確認する
- 将来、居酒屋・バー・レストランを意図的にバランスよく収集する必要が生じた場合は、店舗Typeまたは検索語を分けて複数回Text Searchを行い、`placeId`で重複排除して統合する方針を検討する

## 12. 今後の実装優先順

第0節の移行順を優先する。旧方針のNext.js向け機能追加やstreaming Route Handler実装は進めない。移行と並行して機能を拡張する範囲は別途決める。

## 13. 変更履歴

- v0.1-draft: 初版下書き作成
- 2026-04-05: Graph の3 Node実装状況と次の優先タスクを更新
- 2026-04-05: `POST /api/izakaya/search` の API Route を追加し、入力検証と Graph 起動入口を実装
- 2026-04-06: 現状の単一アプリ寄り構成と、将来のモノレポ移行方針を追記
- 2026-04-26: API Route 疎通後の返却 JSON 確認観点と、実在性改善候補を追記
- 2026-04-26: Go backend の初期責務案、駅サジェスト API 案、ユーザー駅設定 API 案、Cognito 方針を追記
- 2026-05-16: 次の優先実装を API Route + Langfuse の最小完成に整理
- 2026-05-31: 検索結果表示を `/results/[id]` と AI SDK `streamText` による streaming 方針で整理
- 2026-06-28: Server Action を `app/_actions` へ薄い入口として分離し、フォーム変換・検索作成・DB保存取得を `app/lib/server/izakayaSearch/` に整理。次の優先実装を `/results/[id]` の非 streaming 結果表示完成に更新
- 2026-07-20: Next.js の配置先を `src/app/` へ移行した現状に合わせて、実装パスと結果表示の到達点を更新。`findSearchResultById` は検証済みの `result` を返却する状態を記録。
- 2026-08-01: 駅名からの候補取得には Google Places Text Search (New) を採用し、厳密な半径指定を必要としない現段階では Nearby Search (New) を使用しない方針を記録。
- 2026-08-01: 再検索でソフト条件のみを外し、最終ハード条件ゲートで不適合・未確認候補を推薦から除外する候補取得・根拠検証フローを記録。
- 2026-08-08: 初期のText Searchでは `includedType` を指定せず、居酒屋を中心に飲酒可能なレストランやバーも候補へ残す方針を記録。

- 2026-10-31: AI応答待ちに伴うタイムアウト関連エラーの懸念を指摘されたことを背景に、Next.jsからVite＋React／Go API／Node.js AIサービスへの移行を決定。apps配下の構成、DDDの責務、.yaml統一、移行順を記録。実際のエラー発生や原因確定を意味せず、今回はドキュメントのみ更新。
