import { RunnableConfig } from "@langchain/core/runnables";
import { SearchState } from "@/ai-api/schemas/izakaya";
import { ai } from "@/ai-api/libs/LangChain";

export async function buildSummary(
  state: SearchState,
  _config: RunnableConfig,
): Promise<{ summary: string }> {
  const prompt = `あなたは居酒屋候補の検索結果を要約するアシスタントです。

  次の request と ranked を読み取り、検索結果全体の要約文を日本語の文字列1つだけで返してください。
  JSON、Markdown、コードブロック、箇条書きは不要です。
  出力は必ずプレーンな文章1文から3文だけにしてください。

  制約:
  - ranked の内容に基づいて要約する
  - 上位候補の傾向を短くまとめる
  - request の条件にどう合っているかを含める
  - 入力に存在しない情報は推測しない
  - 店名を列挙しすぎない
  - 飲み放題やビール条件に触れる場合は、ranked 内に根拠があるときだけ触れる
  - 冗長にしない
  - 日本語で自然に書く

  要約で触れてよい観点:
  - 候補件数
  - エリア条件
  - 人数感
  - 予算感
  - 雰囲気や利用シーン
  - 飲み放題・ビール条件への一致傾向
  - 上位候補に共通する特徴

  request:
  ${JSON.stringify(state.request, null, 2)}

  ranked:
  ${JSON.stringify(state.ranked, null, 2)}

  返答形式:
  - 文字列のみ
  - 1文から3文
  - 余計な前置きは禁止`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
  });

  const text = response.text ?? "";
  return { summary: text };
}
