import { z } from "zod";

export const searchIntentSchema = z.object({
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  location: z
    .object({
      town: z.string().nullable(),
      radius: z.enum(["exact", "near", "anywhere"]).nullable(),
    })
    .nullable()
    .transform(
      (v) => v ?? { town: null as string | null, radius: "anywhere" as const },
    ),
  attributes: z.array(z.string()).default([]),
  exclude_attributes: z.array(z.string()).default([]),
  sort_preference: z
    .enum(["quality", "distance", "price"])
    .nullable()
    .default("quality"),
  price_level: z.number().int().min(1).max(4).nullable(),
  result_count: z.number().int().min(1).max(12).default(10),
  /** Specific products, dishes, or services mentioned ("fish tacos", "cold brew", "paddleboard rental"). */
  specific_items: z.array(z.string()).optional(),
  /** Dietary restrictions or needs mentioned ("gluten_free", "vegan", "vegetarian", "dairy_free"). */
  dietary_needs: z.array(z.string()).optional(),
  /** Meal time if mentioned. */
  meal_period: z
    .enum(["breakfast", "brunch", "lunch", "dinner", "late_night"])
    .nullable()
    .optional(),
  /** Atmosphere descriptors mentioned ("romantic", "waterfront", "outdoor_seating", "quiet"). */
  atmosphere_needs: z.array(z.string()).optional(),
  /** Specific occasion mentioned ("date_night", "family_outing", "rainy_day", "girls_trip", "celebration"). */
  occasion: z.string().nullable().optional(),
  /**
   * Query classification for routing:
   *   keyword  — simple type query ("bookstores", "coffee shops")
   *   specific — looking for a specific item/feature ("places with fish tacos", "gluten free pizza")
   *   vibe     — atmosphere or occasion focused ("romantic waterfront dinner", "rainy day activity")
   */
  query_type: z
    .enum(["keyword", "specific", "vibe"])
    .optional()
    .transform((q) => q ?? "keyword"),
});

export type SearchIntent = z.infer<typeof searchIntentSchema>;

export const aiResponseSchema = z.object({
  recommendations: z.array(
    z.object({
      business_id: z.string().uuid(),
      rank: z.number().int(),
      headline: z.string(),
      explanation: z.string(),
      highlighted_tags: z.array(z.string()),
    }),
  ),
  search_summary: z.string(),
  suggestions: z.array(z.string()).optional(),
});

export type AIResponse = z.infer<typeof aiResponseSchema>;

export function validateAIResponse(
  parsed: unknown,
  candidateIds: Set<string>,
): { valid: true; data: AIResponse } | { valid: false; errors: string[] } {
  const r = aiResponseSchema.safeParse(parsed);
  if (!r.success) {
    return { valid: false, errors: r.error.issues.map((i) => i.message) };
  }
  const errors: string[] = [];
  const ids = r.data.recommendations.map((x) => x.business_id);
  for (const rec of r.data.recommendations) {
    if (!candidateIds.has(rec.business_id)) {
      errors.push(`Invalid business_id: ${rec.business_id}`);
    }
  }
  if (new Set(ids).size !== ids.length) {
    errors.push("Duplicate business_id in recommendations");
  }
  if (errors.length) return { valid: false, errors };
  return { valid: true, data: r.data };
}
