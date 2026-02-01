import { NextResponse } from "next/server";
import { any, z } from "zod";

const ReqSchema = z.object({
  location: z.string().min(1),
  people: z.number().int().min(1).max(50),
  mood: z.number().min(0).max(100), // 0 casual - 100 formal
  allYouCanDrink: z.boolean(),
  beerRequired: z.boolean(),
});

type RecommendReq = z.infer<typeof ReqSchema>;

type Candidate = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  website?: string;
  googleMapsUrl?: string;
  editorialSummary?: string;
  reviewsText: string[]; // レビューの本文（根拠）
};

type RecommendationItem = {
  placeId: string;
  name: string;
  address: string;
  score: number;
  reasons: string[]; // ここは “生成” ではなくルールから作る
  evidence: {
    allYouCanDrinkHit?: string; // 根拠テキスト（キーワード一致したレビュー断片）
    beerHit?: string;
  };
  meta: {
    rating?: number;
    userRatingsTotal?: number;
    priceLevel?: number;
    googleMapsUrl?: string;
    website?: string;
  };
};

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

function requireEnv(v: string | undefined, key: string): string {
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

/**
 * 1) まず “実在候補” を取る（Text Search）
 * - keyword に "居酒屋" を入れて、架空が混ざる余地を無くす
 */
async function searchPlaces(
  location: string,
): Promise<Array<{ placeId: string }>> {
  const key = requireEnv(GOOGLE_API_KEY, "GOOGLE_MAPS_API_KEY");
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json",
  );
  url.searchParams.set("query", `${location} 居酒屋`);
  url.searchParams.set("language", "ja");
  url.searchParams.set("region", "jp");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`Places textsearch failed: ${res.status}`);
  const data = await res.json();

  const results = Array.isArray(data.results) ? data.results : [];

  // place_id がないものは除外（＝実在保証の入口で弾く）
  return results
    .map((r: any) => ({ placeId: r.place_id as string }))
    .filter((x) => typeof x.placeId === "string" && x.placeId.length > 0)
    .slice(0, 15); // まずは上位15件
}

/**
 * 2) placeId で詳細を取り直して “実在検証”
 * - ここで name/address が確定する
 * - これ以外の経路で店を作らないのが “架空店混入防止” の核心
 */
async function getPlaceDetails(placeId: string): Promise<Candidate | null> {
  const key = requireEnv(GOOGLE_API_KEY, "GOOGLE_MAPS_API_KEY");
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("language", "ja");
  url.searchParams.set("region", "jp");
  url.searchParams.set(
    "fields",
    [
      "place_id",
      "name",
      "formatted_address",
      "geometry",
      "rating",
      "user_ratings_total",
      "price_level",
      "url",
      "website",
      "editorial_summary",
      "reviews",
    ].join(","),
  );
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`Places details failed: ${res.status}`);
  const data = await res.json();

  const result = data?.result;
  if (!result?.place_id || !result?.name || !result?.formatted_address)
    return null;

  const lat = result?.geometry?.location?.lat;
  const lng = result?.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const reviewsText: string[] = Array.isArray(result.reviews)
    ? result.reviews.map((r: any) => String(r?.text ?? "")).filter(Boolean)
    : [];

  return {
    placeId: result.place_id,
    name: result.name,
    address: result.formatted_address,
    lat,
    lng,
    rating: typeof result.rating === "number" ? result.rating : undefined,
    userRatingsTotal:
      typeof result.user_ratings_total === "number"
        ? result.user_ratings_total
        : undefined,
    priceLevel:
      typeof result.price_level === "number" ? result.price_level : undefined,
    googleMapsUrl: typeof result.url === "string" ? result.url : undefined,
    website: typeof result.website === "string" ? result.website : undefined,
    editorialSummary: result.editorial_summary?.overview
      ? String(result.editorial_summary.overview)
      : undefined,
    reviewsText,
  };
}

function normalize(n: number, min: number, max: number): number {
  if (max <= min) return 0;
  const v = (n - min) / (max - min);
  return Math.min(1, Math.max(0, v));
}

/**
 * 3) 飲み放題/ビール “必須” をどう扱うか
 * Placesには確定フィールドがないので、捏造しないために
 * 「レビュー/サマリに根拠テキストがある場合のみ」判定/加点する
 *
 * - 必須=true のとき：
 *   - 根拠が見つからない店は “除外” せず、スコアを強く下げる（ゼロ除外だと全滅しやすい）
 *   - UIで「根拠が取れない場合あり」を表示できるよう evidence を返す
 */
function findEvidenceText(
  texts: string[],
  keywords: string[],
): string | undefined {
  for (const t of texts) {
    const hit = keywords.some((k) => t.includes(k));
    if (hit) {
      // 長すぎると返しにくいので短く
      return t.slice(0, 80);
    }
  }
  return undefined;
}

function scoreAndExplain(c: Candidate, req: RecommendReq): RecommendationItem {
  // rating: 0..5, reviews: 0..(多いほど良い)
  const ratingScore = c.rating ? normalize(c.rating, 3.0, 4.8) : 0.3; // 不明でも0にはしない
  const popScore = c.userRatingsTotal
    ? normalize(Math.log10(Math.max(10, c.userRatingsTotal)), 1, 4)
    : 0.3;

  // mood: 0 casual -> price低めを少し好む / 100 formal -> price高めを少し好む
  const price = typeof c.priceLevel === "number" ? c.priceLevel : 2; // 0-4相当
  const formalPref = normalize(req.mood, 0, 100);
  const priceScore = 1 - Math.abs(normalize(price, 0, 4) - formalPref); // moodに近いほど高い

  // 人数はPlacesだけでは確定しにくいので、ここでは未評価（将来：Hotpepper等で席/個室/大人数可を判定）
  const peopleScore = req.people >= 8 ? 0.6 : 0.8;

  const evidencePool = [c.editorialSummary ?? "", ...c.reviewsText].filter(
    Boolean,
  );

  const allYouCanDrinkHit = findEvidenceText(evidencePool, [
    "飲み放題",
    "飲放題",
    "飲み放題あり",
  ]);
  const beerHit = findEvidenceText(evidencePool, [
    "ビール",
    "生ビール",
    "プレモル",
    "黒ラベル",
    "ハートランド",
  ]);

  // 必須条件のペナルティ（根拠がない＝嘘とは言わないが、確信が持てないので下げる）
  let mustPenalty = 1.0;
  if (req.allYouCanDrink) mustPenalty *= allYouCanDrinkHit ? 1.0 : 0.55;
  if (req.beerRequired) mustPenalty *= beerHit ? 1.0 : 0.75;

  // 重み（まずはシンプル）
  const base =
    0.45 * ratingScore + 0.25 * popScore + 0.2 * priceScore + 0.1 * peopleScore;

  const score = Math.max(0, Math.min(1, base * mustPenalty));

  const reasons: string[] = [];
  if (c.rating) reasons.push(`評価が高め（★${c.rating.toFixed(1)}）`);
  if (c.userRatingsTotal)
    reasons.push(`口コミ件数が多い（${c.userRatingsTotal}件）`);
  if (typeof c.priceLevel === "number")
    reasons.push(`価格帯の目安（level ${c.priceLevel}）`);
  if (req.allYouCanDrink)
    reasons.push(
      allYouCanDrinkHit
        ? "飲み放題の言及あり（根拠あり）"
        : "飲み放題は根拠が取れない可能性",
    );
  if (req.beerRequired)
    reasons.push(
      beerHit ? "ビールの言及あり（根拠あり）" : "ビールは根拠が取れない可能性",
    );

  return {
    placeId: c.placeId,
    name: c.name,
    address: c.address,
    score,
    reasons,
    evidence: {
      allYouCanDrinkHit,
      beerHit,
    },
    meta: {
      rating: c.rating,
      userRatingsTotal: c.userRatingsTotal,
      priceLevel: c.priceLevel,
      googleMapsUrl: c.googleMapsUrl,
      website: c.website,
    },
  };
}

export async function POST(req: Request) {
  try {
    const body = ReqSchema.parse(await req.json());

    // 1) 実在候補取得
    const seeds = await searchPlaces(body.location);

    // 2) placeIdで詳細を再取得（＝実在検証）
    const details = await Promise.all(
      seeds.map((s) => getPlaceDetails(s.placeId)),
    );
    const candidates = details.filter((x): x is Candidate => x !== null);

    // 3) ルールでスコアリング（ここではLLM使わない：捏造ゼロを優先）
    const ranked = candidates
      .map((c) => scoreAndExplain(c, body))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({
      items: ranked,
      meta: {
        candidates: candidates.length,
        note: "飲み放題/ビールはPlacesの確定フィールドではないため、レビュー等の根拠テキスト一致で判定しています（捏造防止）。",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 400 },
    );
  }
}
