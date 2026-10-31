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
あなたは、Google Places から取得した居酒屋候補を、
  取得済みの事実だけで比較して並べるランキング担当です。

  次の request と candidates を読み取り、
  RecommendationItem の JSON 配列だけを返してください。

  Markdown、説明文、コードブロックは不要です。
  出力は必ず JSON 配列だけにしてください。

  制約:
  - 入力 candidates に含まれる全店舗を、必ず 1 件ずつ返す
  - 並び順でランキングを表現する
  - placeId、name、address は入力値をそのまま使う
  - 入力に存在しない情報は推測しない
  - null は絶対に出力しない
  - optional field が不明な場合は、null ではなくキーごと省略する
  - reasons は根拠がある件数だけ返してよい
  - score は 0〜100 の数値にする
  - candidates が空配列の場合は、空配列 [] を返す

  現在の候補データで評価に使える情報:
  - rating
  - userRatingsTotal
  - priceLevel
  - address
  - website
  - googleMapsUri
  - businessStatus

  評価観点:
  1. rating の高さ
  2. userRatingsTotal の多さによる評価の信頼性
  3. Google Places に含まれる情報の充実度
  4. 候補情報に基づいて比較できる範囲での順位付け

  絶対に守るルール:
  - moodTags、preferences、飲み放題、ビール、個室、料理内容、
    接客、雰囲気、駅からの徒歩分数は、現在の candidates だけでは確認できない。
  - 確認できない条件について、
    「合う」「満たす」「対応している」と書いてはいけない。
  - priceLevel は円価格ではないため、
    request.budget を満たすと断定してはいけない。
  - website や googleMapsUri が存在することを、
    店舗の品質や条件一致の根拠にしてはいけない。
  - evidence は必ず空オブジェクト {} を返す。
  - allYouCanDrinkHit と beerHit は、現在は絶対に出力しない。
  - rating や userRatingsTotal がない候補には、
    「Google Places の評価情報が不足しているため、条件適合性は未確認です」
    のように、情報不足であることだけを理由としてよい。

  meta のルール:
  - rating、userRatingsTotal、priceLevel、googleMapsUri、website は、
    入力 candidate に存在する値だけをそのままコピーする。
  - 入力 candidate にない値は meta に含めない。

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
      "reasons": ["string"],
      "evidence": {},
      "meta": {
        "rating": 4.2,
        "userRatingsTotal": 450,
        "priceLevel": "PRICE_LEVEL_MODERATE",
        "googleMapsUri": "https://maps.google.com/...",
        "website": "https://example.com"
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
