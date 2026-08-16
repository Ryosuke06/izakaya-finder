import { ai } from "@/ai-api/libs/LangChain";
import {
  PlanPlaceSearchNode,
  PlanPlaceSearchNodeSchema,
  SearchState,
} from "@/ai-api/schemas/izakaya";
import { RunnableConfig } from "@langchain/core/runnables";
import z from "zod";

export async function planPlacesSearch(
  state: SearchState,
  _config: RunnableConfig,
): Promise<{ planPlaceSearch: PlanPlaceSearchNode }> {
  const prompt = `あなたは、居酒屋検索サービスのGoogle Places Text Searchに渡す
  「ソフト検索語」を選ぶ担当です。

  あなたは店舗を推薦してはいけません。
  あなたは検索クエリ全体を作ってはいけません。
  あなたはハード条件を変更、削除、緩和してはいけません。

  # アプリ側で固定して追加する情報

  以下はアプリ側が必ず管理するため、出力に含めてはいけません。

  - 駅名
  - 「居酒屋」
  - 飲み放題必須などのハード条件
  - 人数
  - 予算
  - ビール必須
  - includedType
  - retryCount
  - 店舗名、住所、URL

  # あなたの役割

  ユーザーの moodTags と preferences を読み、
  Google検索結果を少し絞り込むための
  「再検索時に外してよいソフト検索語」だけを選んでください。

  例:

  - 静かめ、落ち着いた → 「静か」または「落ち着いた」
  - デート向き → 「デート」
  - 同僚との飲み会、わいわい → 「宴会」または「会社宴会」
  - 一人飲み → 「一人飲み」
  - 上司と利用、接待向き → 「接待」

  # 絶対ルール

  - softQueryTerms は最大2個までにする。
  - 同じ意味の語を重複させない。
  - 短い日本語の検索語だけを返す。
  - 「必須」「絶対」「〜以外不可」「〜以下」など、
    明確に必須と書かれた条件は softQueryTerms に入れてはいけない。
  - 必須かソフト条件か判断できない内容も、
    softQueryTerms に入れてはいけない。
  - 個室、禁煙、人数、予算、飲み放題、ビールなどは、
    検索語に含めても条件を満たす証拠にはならない。
  - 店舗の実在情報や、ユーザー入力にない事実を推測してはいけない。
  - 該当するソフト検索語がなければ空配列を返す。

  # 入力

  ${JSON.stringify(state.request, null, 2)}

  # 出力JSON形式

  {
    "softQueryTerms": ["string"]
  }

  JSON以外は出力しないでください。`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "";
  const parsedJson = JSON.parse(text);

  const AISchema = z.object({
    softQueryTerms: z.array(z.string()),
  });

  const AiParsedJson = AISchema.parse(parsedJson);
  const hardQueryTerms = state.request.allYouCanDrink ? ["飲み放題"] : [];

  if (state.request.area.mode === "station_input") {
    const textQuery = [
      `${state.request.area.station}駅`,
      "居酒屋",
      ...hardQueryTerms,
      ...AiParsedJson.softQueryTerms,
    ].join(" ");

    const planPlaceSearch = PlanPlaceSearchNodeSchema.parse({
      textQuery: textQuery,
      hardQuery: hardQueryTerms,
      softQuery: AiParsedJson.softQueryTerms,
      retryCount: 0,
    });

    return { planPlaceSearch: planPlaceSearch };
  } else {
    throw new Error("textQueryがうまくわたってないです。");
  }
}
