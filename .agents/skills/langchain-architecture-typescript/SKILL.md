---
name: langchain-architecture-typescript
description: izakaya-finder 向けの TypeScript LangChain/LangGraph 実装スキル。pnpm + Next.js + ai-api 構成で、@langchain/google-genai、@langchain/langgraph、zod、langfuse を使ったエージェント/ワークフロー設計・実装・レビュー時に使用する。「LangGraphで実装したい」「Geminiで構成したい」「LangChainをこのリポジトリに合わせて書きたい」などをトリガーに有効化する。
---

# LangChain Architecture (izakaya-finder / TypeScript)

この Skill は、このリポジトリでそのまま使える実装パターンだけに絞る。

## Project Profile

- Package manager: `pnpm`
- Runtime: `Node.js >= 18`
- Framework: `Next.js`
- Core deps:
  - `@langchain/core`
  - `@langchain/langgraph`
  - `@langchain/google-genai`
  - `langchain`
  - `zod`
  - `langfuse` / `langfuse-langchain`

## File Placement Rules

- Graph/state定義: `ai-api/graphs/*.ts`
- 共通LLM初期化: `ai-api/libs/*.ts`
- 入出力schema: `ai-api/schemas/*.ts`
- API公開層（必要なら）: `app/api/**/route.ts`

## Default Stack Decisions

- 既定モデルは Gemini を使う（`@langchain/google-genai`）。
- 状態管理は `Annotation.Root` を使う。
- 入力バリデーションは必ず `zod` を使う。
- 文字列連結の即席プロンプトより、`ChatPromptTemplate` を優先する。
- 長い処理は node 分割し、1 node 1責務にする。

## Environment Variables

最低限、以下を想定する。

```bash
GOOGLE_API_KEY=...
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_SECRET_KEY=...
LANGFUSE_BASEURL=https://cloud.langfuse.com
```

既存コードに `izakaya_found_gimini_api` など揺れがある場合は、まず環境変数名を統一する。

## Setup Commands (pnpm)

```bash
pnpm add @langchain/core @langchain/langgraph @langchain/google-genai langchain zod
pnpm add langfuse langfuse-langchain
```

## Minimal LLM Factory

`ai-api/libs/langchainClient.ts`

```ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function createChatModel() {
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.2,
  });
}
```

## Recommended State Shape

`ai-api/graphs/izakayaSearchGraph.ts` のように `Annotation.Root` を使う。

```ts
import { Annotation } from "@langchain/langgraph";
import type { IzakayaSearchRequest } from "../schemas/izakaya";

type Candidate = {
  placeId: string;
  name: string;
  reviewsText: string[];
};

type RecommendationItem = {
  placeId: string;
  name: string;
  score: number;
  reasons: string[];
};

export const SearchState = Annotation.Root({
  request: Annotation<IzakayaSearchRequest>(),
  candidates: Annotation<Candidate[]>(),
  ranked: Annotation<RecommendationItem[]>(),
  summary: Annotation<string>(),
});
```

## Runnable Graph Pattern

```ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createChatModel } from "../libs/langchainClient";
import { SearchState } from "./izakayaSearchGraph";

const llm = createChatModel();

async function rankNode(state: typeof SearchState.State) {
  const prompt = ChatPromptTemplate.fromTemplate(
    [
      "You are an izakaya recommendation assistant.",
      "User preference: {request}",
      "Candidates: {candidates}",
      "Return concise ranking reasons.",
    ].join("\n")
  );

  const response = await llm.invoke(
    await prompt.format({
      request: JSON.stringify(state.request),
      candidates: JSON.stringify(state.candidates),
    })
  );

  return {
    summary: String(response.content),
  };
}

export const searchGraph = new StateGraph(SearchState)
  .addNode("rank", rankNode)
  .addEdge(START, "rank")
  .addEdge("rank", END)
  .compile();
```

## Zod-First API Boundary

```ts
import { IzakayaSearchRequestSchema } from "../schemas/izakaya";

export function parseSearchInput(input: unknown) {
  return IzakayaSearchRequestSchema.parse(input);
}
```

- `parse` 例外を握りつぶさない。
- API層で `safeParse`、内部ロジックで `parse` を使い分ける。

## Langfuse Tracing Integration

```ts
import { CallbackHandler } from "langfuse-langchain";

export function createLangfuseCallback() {
  return new CallbackHandler({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASEURL,
  });
}

// invoke example
// await graph.invoke(input, { callbacks: [createLangfuseCallback()] });
```

`langfuse-langchain` は将来的に移行対象になりうるため、新規導入時は `langfuse` SDK本体の更新方針も確認する。

## Next.js Route Handler Pattern

`app/api/izakaya/search/route.ts`

```ts
import { NextResponse } from "next/server";
import { IzakayaSearchRequestSchema } from "@/ai-api/schemas/izakaya";
import { searchGraph } from "@/ai-api/graphs/searchGraph";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = IzakayaSearchRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await searchGraph.invoke({
    request: parsed.data,
    candidates: [],
    ranked: [],
    summary: "",
  });

  return NextResponse.json(result);
}
```

## Review Checklist (Repo-Specific)

- `pnpm` 前提のコマンドになっているか。
- model 初期化が `@langchain/google-genai` で統一されているか。
- schema は `zod` で API 境界に置かれているか。
- Graph state が `Annotation.Root` で型定義されているか。
- node が責務分離されているか（取得、評価、要約を混ぜない）。
- 環境変数名に表記ゆれがないか（例: `gemini` の typo）。
- エラーを `any` で潰していないか。

## Anti-Patterns

- `OpenAIApiKey: ...` のような代入漏れ・無効式を残す。
- 1つの node で API呼び出し、整形、評価、要約を全部やる。
- `unknown` 入力を schema 検証なしで処理する。
- model 名・env 名をハードコードして分散させる。

## References

- LangChain JS: https://docs.langchain.com/oss/javascript/langchain/overview
- LangGraph JS: https://docs.langchain.com/oss/javascript/langgraph/overview
- LangGraph API: https://langchain-ai.github.io/langgraphjs/
- Google GenAI integration: https://js.langchain.com/docs/integrations/chat/google_generativeai
- Langfuse + LangChain: https://langfuse.com/docs/integrations/langchain
