import {
  createInitialSearchState,
  graph,
} from "@/ai-api/graphs/izakayaSearchGraph";
import { createLangfudeCallback } from "@/ai-api/libs/Langfuse";
import { IzakayaSearchRequestSchema } from "@/ai-api/schemas/izakaya";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = IzakayaSearchRequestSchema.parse(body);
    const initialState = createInitialSearchState(parsed);
    const langfuseHandler = createLangfudeCallback();

    const result = await graph.invoke(initialState, {
      callbacks: [langfuseHandler],
      runName: "izakayaLangGtaph",
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
