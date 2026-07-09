import {
  createInitialSearchState,
  graph,
} from "@/ai-api/graphs/izakayaSearchGraph";
import { createLangfuseCallback } from "@/ai-api/libs/Langfuse";
import { IzakayaSearchRequestSchema } from "@/ai-api/schemas/izakaya";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

// UI のフォーム送信では未使用。API疎通確認・外部呼び出し・将来の fetch 導線用に一旦残す。
// TODO: Server Action と Graph 実行 usecase を共通化して重複をなくす
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = IzakayaSearchRequestSchema.parse(body);
    const initialState = createInitialSearchState(parsed);
    const langfuseHandler = createLangfuseCallback();

    const result = await graph.invoke(initialState, {
      callbacks: [langfuseHandler],
      runName: "izakayaLangGraph",
      tags: ["izakaya-search"],
    });

    await langfuseHandler.flushAsync();

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    console.error("POST /api/izakaya/search failed", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
