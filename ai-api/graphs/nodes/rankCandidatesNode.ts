import { ai } from "@/ai-api/libs/LangChain";
import {
  RecommendationItem,
  RecommendationItemSchema,
  SearchState,
} from "@/ai-api/schemas/izakaya";
import { RunnableConfig } from "@langchain/core/runnables";
import { z } from "zod";

const RankedCandidatesSchema = z.array(RecommendationItemSchema);

export async function rankCandidates(
  state: SearchState,
  _config: RunnableConfig,
): Promise<{ ranked: RecommendationItem[] }> {
  const prompt = `
あなたは居酒屋候補を比較評価し、おすすめ順に並べるランキングエージェントです。

  次の request と candidates を読み取り、RecommendationItem の JSON 配列のみを返してください。
  Markdown、説明文、コードブロックは不要です。
  出力は必ず JSON 配列だけにしてください。

  制約:
  - 入力 candidates に含まれる全店舗を必ず1件ずつ返す
  - 並び順でランキングを表現する
  - placeId, name, address は入力値をそのまま使う
  - 入力に存在しない情報は推測しない
  - evidence は根拠がある場合のみ入れる
  - 根拠がなければ allYouCanDrinkHit, beerHit は省略してよい
  - reasons は各店舗につき 2〜4 件
  - score は 0〜100 の整数または小数でよい

  評価観点:
  1. rating の高さ
  2. userRatingsTotal の多さによる信頼性
  3. editorialSummary と reviewsText の具体性
  4. 雰囲気、接客、料理、コスパに関する記述
  5. request との一致度
  6. 飲み放題やビールに関する明示的な記述

  request:
  ${JSON.stringify(state.request, null, 2)}

  candidates:
  ${JSON.stringify(state.candidates, null, 2)}

  返却形式:
  [
    {
      "placeId": "string",
      "name": "string",
      "address": "string",
      "score": 0,
      "reasons": ["string", "string"],
      "evidence": {
        "allYouCanDrinkHit": "string",
        "beerHit": "string"
      },
      "meta": {
        "rating": 0,
        "userRatingsTotal": 0,
        "priceLevel": 0,
        "googleMapsUrl": "string",
        "website": "string"
      }
    }
  ]
  
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "[]";
  const parsedJson = JSON.parse(text);
  const ranked = RankedCandidatesSchema.parse(parsedJson);

  return { ranked };
}
