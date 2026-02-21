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

### 5.1 入力条件

`IzakayaSearchRequestSchema`（`ai-api/schemas/izakaya.ts`）

- `location`: 検索地点（必須文字列）
- `people`: 人数（1〜50の整数）
- `mood`: 雰囲気スコア（0〜100）
- `allYouCanDrink`: 飲み放題重視フラグ（既定 `false`）
- `beerRequired`: ビール必須フラグ（既定 `false`）

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
  "location": "渋谷",
  "people": 4,
  "mood": 70,
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

## 10. 現状実装状況

### 10.1 実装済み

- 入力スキーマ定義（`ai-api/schemas/izakaya.ts`）
- 検索状態/型定義（`ai-api/graphs/izakayaSearchGraph.ts`）

### 10.2 未実装・要修正

- 検索実行グラフ本体
- API ルート
- UI 画面
- `ai-api/libs/LangChain.ts` の実処理
- 環境変数名の統一（`gemini` 表記ゆれを含む）

## 11. 今後の実装優先順（提案）

1. API ルートの作成と `zod` バリデーション
2. SearchGraph のノード実装（候補収集/評価/要約）
3. 最小 UI（フォーム + 結果表示）
4. トレーシング（Langfuse）連携
5. スコアリングロジックの改善

## 12. 変更履歴

- v0.1-draft: 初版下書き作成
