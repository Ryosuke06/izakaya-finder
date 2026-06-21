import "server-only";

import { IzakayaSearchRequestSchema } from "@/ai-api/schemas/izakaya";
import z from "zod";

const BooleanFormValueSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const IzakayaSearchFormSchema = z.object({
  station: z.string().min(1),
  people: z.coerce.number().int().min(1).max(50),
  budget: z.enum(["up_to_3000", "up_to_5000", "up_to_8000", "unspecified"]),
  isDrink: BooleanFormValueSchema,
  isBeer: BooleanFormValueSchema,
  mood: z.enum(["waiwai", "calm", "date", "colleagues", "with_boss", "solo"]),
  preferences: z.string().optional(),
});

export function parseIzakayaSearchForm(formData: FormData) {
  const parsed = IzakayaSearchFormSchema.safeParse({
    station: formData.get("station"),
    people: formData.get("people"),
    budget: formData.get("budget"),
    isDrink: formData.get("isDrink"),
    isBeer: formData.get("isBeer"),
    mood: formData.get("mood"),
    preferences: formData.get("preferences"),
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.flatten(),
    };
  }

  const request = IzakayaSearchRequestSchema.parse({
    area: {
      mode: "station_input",
      station: parsed.data.station,
    },
    people: parsed.data.people,
    budget: parsed.data.budget,
    allYouCanDrink: parsed.data.isDrink,
    beerRequired: parsed.data.isBeer,
    moodTags: [parsed.data.mood],
    preferences: parsed.data.preferences,
  });

  return {
    ok: true as const,
    data: request,
  };
}
