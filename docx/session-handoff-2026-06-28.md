# セッション引き継ぎメモ 2026-06-28

## 2026-10-31 方針変更（最新）

Next.jsを外し、`apps/web/`（Vite＋React）、`apps/backend/`（Go API）、`apps/ai-service/`（TypeScript／Node.js）へ移行する方針を決定した。YAMLの拡張子は `.yaml` に統一し、開発操作は `Taskfile.yaml` へ集約する。今回はドキュメントのみ更新し、移行は未実装。

背景は、Next.jsでAI応答を待つ構成に対し、TTL・実行時間制限に関係するエラーが発生する懸念があると指摘されたこと。実際にエラーが発生したという記録ではなく、具体的な制限と環境は未確認。Goへの分離だけで解消すると断定せず、通信タイムアウト・キャンセル・同期／非同期方式を設計する。

最新の構成・責務・移行手順は [仕様書の第0節](app-spec-draft.md#0-最新の構成決定2026-10-31) を参照する。以下は過去の進捗・引き継ぎ履歴として保持し、旧Next.js向けの次回手順は再開手順として使用しない。

2026-10-31のコード確認では、Google PlacesのGraph接続、結果カードと要約表示、存在しないIDの404は実装済み。旧記載の未実装項目とは区別する。実行確認・テストは今回行っていない。

## 過去の記録

## 目的

次回セッションで、検索フォーム送信後に `/results/[id]` へ遷移し、DB保存済みの検索結果を表示する作業を迷わず再開できる状態にする。

## 今回進んだこと

- Server Action の責務を整理した
  - `src/app/_actions/izakayaSearch.ts`
    - フォーム送信の入口
    - `createIzakayaFromForm(formData)` を呼ぶ
    - 作成された `Search.id` で `/results/[id]` へ redirect
- フォーム入力の変換を Zod schema へ分離した
  - `src/app/lib/server/izakayaSearch/formSchema.ts`
    - `FormData` を検証
    - `people` は `z.coerce.number()` で number 化
    - `isDrink` / `isBeer` は `z.enum(["true", "false"]).transform(...)` で boolean 化
    - 最後に `IzakayaSearchRequestSchema` で内部検索リクエストとして検証
- 検索作成ユースケースを分離した
  - `src/app/lib/server/izakayaSearch/createSearch.ts`
    - フォーム変換
    - 初期 state 作成
    - `graph.invoke(...)`
    - DB保存
- DBアクセスを repository に分離した
  - `src/app/lib/server/izakayaSearch/searchRepository.ts`
    - `createSearchRecord(...)`
    - `findSearchResultById(id)` は保存済み結果を取得し、検証済みの `result` を返却
- 結果ページの取得処理に着手した
  - `src/app/results/[id]/page.tsx`
    - `params.id` を取得
    - `findSearchResultById(id)` を呼ぶ
    - 現状は `ranked` の評価値と Web サイト URL を仮表示

## 現在の注意点

- `findSearchResultById(id)` は `SearchStateSchema.parse(search.result)` の結果を `result` として返却済み
- 存在しない `Search.id` の扱いは、repository で `throw` するより `null` を返し、`src/app/results/[id]/page.tsx` 側で `notFound()` を呼ぶ設計がよい
- `src/app/results/[id]/page.tsx` は `ranked` の評価値と Web サイト URL だけを仮表示している
  - `summary`、店舗名、住所、理由、スコア、リンクを含む一覧表示が次の主作業
- `src/app/results/[id]/components/result_card/index.tsx` は雛形のみで、描画・ページへの統合は未実装
- `smple.json` が未追跡で存在する
  - 複数の JSON 値が連結されているため、現状は JSON として構文エラー
  - 残す場合は `sample.json` へ typo 修正し、fixture 置き場を決める
  - 不要なら削除する

## 次回の実装順

1. `docx/app-spec-draft.md` と `docx/progress-2026-02-23.md` を読む
2. `src/app/lib/server/izakayaSearch/searchRepository.ts` を修正する
   - 未存在時は `null` を返す
  - `SearchStateSchema.parse(search.result)` の結果は返却済みのため、変更後も維持する
3. `src/app/results/[id]/page.tsx` を修正する
   - `notFound()` を使う
   - `summary` と `ranked` の店舗一覧を表示する
4. `pnpm -s tsc --noEmit` を実行して型チェックする
5. フォーム送信から `/results/[id]` 表示まで疎通確認する
6. 動作確認後、`docx/` を再更新する

## 次回実装イメージ

`searchRepository.ts`

```ts
export async function findSearchResultById(id: string) {
  const search = await prisma.search.findUnique({
    where: { id },
  });

  if (!search) {
    return null;
  }

  const parsedResult = SearchStateSchema.parse(search.result);

  return {
    id: search.id,
    station: search.station,
    people: search.people,
    budget: search.budget,
    summary: search.summary,
    result: parsedResult,
  };
}
```

`src/app/results/[id]/page.tsx`

```tsx
import { findSearchResultById } from "@/src/app/lib/server/izakayaSearch/searchRepository";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Results({ params }: Props) {
  const { id } = await params;
  const search = await findSearchResultById(id);

  if (!search) {
    notFound();
  }

  return (
    <main>
      <h1>検索結果</h1>
      <p>{search.summary}</p>

      {search.result.ranked.map((item) => (
        <article key={item.placeId}>
          <h2>{item.name}</h2>
          <p>{item.address}</p>
          <p>スコア: {item.score}</p>
          <ul>
            {item.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </article>
      ))}
    </main>
  );
}
```
