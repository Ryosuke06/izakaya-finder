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
  lat: z.number(),
  lng: z.number(),
  rating: z.number().optional(),
  userRatingsTotal: z.number().optional(),
  priceLevel: z.number().optional(),
  website: z.string(),
  googleMapsUrl: z.string(),
  editorialSummary: z.string().optional(),
  reviewsText: z.array(z.string()),
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
    priceLevel: z.number().optional(),
    googleMapsUrl: z.string().optional(),
    website: z.string().optional(),
  }),
});

export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;

export const SearchStateSchema = z.object({
  request: IzakayaSearchRequestSchema,
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
