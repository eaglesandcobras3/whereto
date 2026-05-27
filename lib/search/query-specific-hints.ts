import type { SearchIntent } from "@/lib/intent-schema";

/**
 * When the embedding + salvage path runs without `primary_category_id`, non-food listings in the
 * same town can rank. Prefer fixing this in **`parseIntentWithOpenAI` (PARSE_SYSTEM)** — the model
 * should set `category` for any venue-seeking query and expand synonyms inside `specific_items`.
 *
 * This helper is only a narrow **structural** backstop: if the parser classified the query as
 * item-focused (`specific`) and filled `specific_items` but forgot `category`, assume `restaurants`.
 * That avoids banks/salons when the LM lists dish terms but omits `category`.
 */
export function inferRestaurantsSlugWhenSpecificItemsNeedCategory(
  intent: Pick<SearchIntent, "category" | "query_type" | "specific_items">,
): "restaurants" | null {
  if (intent.category) return null;
  if (intent.query_type !== "specific") return null;
  const items = (intent.specific_items ?? []).map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return null;
  const blob = items.join(" ").toLowerCase();
  // Gear / retail cues belong to activities or shopping — never infer restaurants from those stems.
  if (
    /\b(kayak|paddleboard|paddleboards|sup\b|surfboard|surfboards|bicycle|scooter|parasail|charter)\b/i.test(
      blob,
    ) ||
    /\b(books?|bookstores?|novels?|sunscreen|jewelry|souvenirs?)\b/i.test(blob) ||
    /\b(clothing|clothes|apparel|fashion|boutique|swimwear|dress|dresses|footwear|sandals|retail|gifts?)\b/i.test(
      blob,
    )
  ) {
    return null;
  }
  return "restaurants";
}
