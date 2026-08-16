import { z } from "zod";

const AreaSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("current_location"),
  }),
  z.object({
    mode: z.literal("station_input"),
    station: z.string().min(1),
  }),
]);

export const IzakayaSearchRequestSchema = z.object({
  area: AreaSchema,
  people: z.number().int().min(1).max(50),
  budget: z.enum(["up_to_3000", "up_to_5000", "up_to_8000", "unspecified"]),
  allYouCanDrink: z.boolean().default(false),
  beerRequired: z.boolean().default(false),
  moodTags: z.array(
    z.enum(["waiwai", "calm", "date", "colleagues", "with_boss", "solo"]),
  ),
  preferences: z.string().optional(),
});

export type IzakayaSearchRequest = z.infer<typeof IzakayaSearchRequestSchema>;

export const CandidateSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  address: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  rating: z.number().optional(),
  userRatingsTotal: z.number().optional(),
  priceLevel: z.string().optional(),
  website: z.string().optional(),
  googleMapsUri: z.string().optional(),
  businessStatus: z.string().optional(),
});

export type Candidate = z.infer<typeof CandidateSchema>;

export const RecommendationItemSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  address: z.string(),
  score: z.number(),
  reasons: z.array(z.string()),
  evidence: z.object({
    allYouCanDrinkHit: z.string().optional(),
    beerHit: z.string().optional(),
  }),
  meta: z.object({
    rating: z.number().optional(),
    userRatingsTotal: z.number().optional(),
    priceLevel: z.string().optional(),
    googleMapsUri: z.string().optional(),
    website: z.string().optional(),
  }),
});

export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;

// ここからNodeの再考案を書く

export const PlanPlaceSearchNodeSchema = z.object({
  textQuery: z.string(),
  hardQuery: z.array(z.string()),
  softQuery: z.array(z.string()),
  retryCount: z.union([z.literal(0), z.literal(1)]),
});

export type PlanPlaceSearchNode = z.infer<typeof PlanPlaceSearchNodeSchema>;

// 以下はNodeのスキーマではないです

export const GooglePlaceSchema = z.object({
  id: z.string(),
  displayName: z.object({
    text: z.string(),
    languageCode: z.string().optional(),
  }),
  formattedAddress: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  googleMapsUri: z.string().optional(),
  primaryType: z.string().optional(),
  types: z.array(z.string()).optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  priceLevel: z.string().optional(),
  businessStatus: z.string().optional(),
  websiteUri: z.string().optional(),
});

export type GooglePlace = z.infer<typeof GooglePlaceSchema>;

export const GooglePlaceTextSearchResponseSchema = z.object({
  places: z.array(GooglePlaceSchema).default([]),
});

export type GooglePlaceTextSearchResponse = z.infer<
  typeof GooglePlaceTextSearchResponseSchema
>;

export const SearchStateSchema = z.object({
  request: IzakayaSearchRequestSchema,

  planPlaceSearch: PlanPlaceSearchNodeSchema.nullable(),
  candidates: z.array(CandidateSchema),
  ranked: z.array(RecommendationItemSchema),
  summary: z.string(),
  traceId: z.string().optional(),
  traceUrl: z.string().optional(),
});

export type SearchState = z.infer<typeof SearchStateSchema>;

//Prisma内のデータベースの方
export const searchResult = z.object({
  id: z.string(),
  allYouCanDrink: z.boolean(),
  beerRequired: z.boolean(),
  budget: z.enum(["up_to_3000", "up_to_5000", "up_to_8000", "unspecified"]),
  createAt: z.date(),
  moodTags: z.enum([
    "waiwai",
    "calm",
    "date",
    "colleagues",
    "with_boss",
    "solo",
  ]),
  people: z.number(),
  performance: z.string(),
  request: IzakayaSearchRequestSchema,
  result: SearchStateSchema,
});
