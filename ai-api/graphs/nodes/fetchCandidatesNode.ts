import {
  Candidate,
  CandidateSchema,
  SearchState,
} from "@/ai-api/schemas/izakaya";
import { RunnableConfig } from "@langchain/core/runnables";
import { ai } from "../../libs/LangChain";
import { z } from "zod";

const CandidatesSchema = z.array(CandidateSchema);

export async function fetchCandidates(
  state: SearchState,
  _config: RunnableConfig,
): Promise<{ candidates: Candidate[] }> {
  const prompt = ` あなたは居酒屋候補収集エージェントです。

  次の request を読み取り、条件に合いそうな居酒屋候補を Candidate の JSON 配列のみで返してください。
  出力は JSON 配列のみです。説明文、Markdown、コードブロックは禁止です。

  必須ルール:
  - 5〜10 件程度の候補を返す
  - 各要素は Candidate の shape に一致させる
  - placeId, name, address, lat, lng, website, googleMapsUrl, reviewsText は必ず含める
  - rating, userRatingsTotal, priceLevel, editorialSummary は不明なら省略可
  - reviewsText は文字列配列にする
  - 入力に存在しない情報は推測しない
  - 実在が不確かな店舗は含めない

  request:
  ${JSON.stringify(state.request, null, 2)}

  返却形式:
  [
    {
      "placeId": "string",
      "name": "string",
      "address": "string",
      "lat": 35.0,
      "lng": 139.0,
      "rating": 4.2,
      "userRatingsTotal": 120,
      "priceLevel": 2,
      "website": "https://example.com",
      "googleMapsUrl": "https://maps.google.com/...",
      "editorialSummary": "string",
      "reviewsText": ["string", "string"]
    }
  ]`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "[]";
  const parsedJson = JSON.parse(text);
  const candidates = CandidatesSchema.parse(parsedJson);

  return { candidates };
}
