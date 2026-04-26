# Izakaya Finder 仕様書（下書き）

- ドキュメント版: v0.1-draft
- 作成日: 2026-02-21
- 対象リポジトリ: `izakaya-finder`

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
    "location": "渋谷",
    "people": 4,
    "mood": 70,
    "allYouCanDrink": true,
    "beerRequired": false
  },
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

## 8. 非機能要件（ドラフト）

- 型安全: TypeScript + `zod`
- 観測性: `traceId`, `traceUrl` を保持可能にする
- 保守性: LangGraph state を中心に責務分離
- パフォーマンス: 候補収集と評価の段階を分け、将来並列化可能な構造にする

## 9. 技術スタック（現状）

- Next.js 16
- React 19
- TypeScript
- LangChain / LangGraph
- Zod
- OpenAI SDK（導入済み）
- Google GenAI 連携パッケージ（導入済み）

## 10. リポジトリ構成方針（現状と将来）

### 10.1 現状の考え方

- 現在は単一リポジトリ内に役割別ディレクトリを置く構成とする
- `app/` は Next.js App Router の画面と API Route の入口を担当する
- `ai-api/` は AI による候補収集、順位付け、要約生成などの処理を担当する
- `backend/` は将来的に独立したサーバー処理が必要になった場合に追加する想定とする
- この段階では「1つのアプリをフォルダで整理している状態」であり、まだモノレポ化はしていない

### 10.2 モノレポ化に関する判断

- 将来的にはモノレポ構成へ移行する方針とする
- ただし、現時点では開発初期のため、無理に分割せずルート直下構成を優先する
- `backend/` や AI 処理が独立した実行単位、デプロイ単位として必要になったタイミングで切り出す
- モノレポは「複数アプリや共通パッケージを1つのリポジトリで管理する方法」として扱う
- マイクロサービス化は別の設計判断であり、モノレポと同義ではない

### 10.3 将来の想定ディレクトリ例

```text
apps/
  web/        Next.js の画面
  backend/    API サーバー
  ai-api/     AI 処理サービス
packages/
  shared/     zod schema / TypeScript 型 / 共通ロジック
  ui/         共通 UI コンポーネント
```

### 10.4 モノレポ化の狙い

- `web`、`backend`、`ai-api` の責務を明確にする
- 共通の `zod` schema や TypeScript 型を `packages/shared` で再利用しやすくする
- 将来のデプロイ分離に備えつつ、コード管理は1つのリポジトリにまとめる
- 開発初期は複雑化を避け、必要になった時点で段階的に移行する

## 11. 現状実装状況

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
- API Route（`app/api/izakaya/search/route.ts`）
  - `req.json()` を `IzakayaSearchRequestSchema` で検証
  - `createInitialSearchState(...)` を生成して `graph.invoke(...)` を実行
  - 成功時は Graph の最終 state を JSON 返却
  - バリデーションエラーは `400`、その他は `500`
- Graph 関連の TypeScript 型チェック
  - `pnpm -s tsc --noEmit` 上、Graph 関連では追加エラーなし
  - 残件は `sample.ts` の別件エラーのみ

### 11.2 未実装・要修正

- API Route の疎通確認
- UI 画面
- Langfuse 連携
- スコアリング/候補抽出の精度改善
- `sample.ts` の別件型エラー解消

### 11.3 API Route 疎通後の確認観点

- `POST /api/izakaya/search` の疎通後は、返却 JSON の内容を以下の観点で確認する
  - `candidates` が 5〜10 件程度返っているか
  - `ranked` が `score` 順に並んでいるか
  - `reasons` が入力条件に合った説明になっているか
  - `summary` が自然な日本語で、入力条件に触れているか
- 特に店舗の実在性を確認する
  - 現状の `fetchCandidates` は LLM による候補生成のため、店名・住所・Google Maps URL の実在保証が弱い
  - 次の改善候補として、`fetchCandidates` を Google Places API などの実データ取得へ寄せる

## 12. 今後の実装優先順（提案）

1. API Route 経由での Graph 実行確認
2. トレーシング（Langfuse）連携
3. 最小 UI（フォーム + 結果表示）
4. スコアリングロジックの改善
5. `sample.ts` の別件型エラー解消

## 13. 変更履歴

- v0.1-draft: 初版下書き作成
- 2026-04-05: Graph の3 Node実装状況と次の優先タスクを更新
- 2026-04-05: `POST /api/izakaya/search` の API Route を追加し、入力検証と Graph 起動入口を実装
- 2026-04-06: 現状の単一アプリ寄り構成と、将来のモノレポ移行方針を追記
- 2026-04-26: API Route 疎通後の返却 JSON 確認観点と、実在性改善候補を追記
