import { describe, expect, it, vi } from "vitest";
import { detectQueryThemes } from "@/lib/ask/search-input";
import { resolveAskSearchIntent } from "@/lib/ask/resolve-ask-search-intent";
import * as searchAi from "@/lib/ai/search-ai";

describe("resolveAskSearchIntent", () => {
  it("uses facet_plan without calling OpenAI for clear coffee + bakery + town query", async () => {
    const parseSpy = vi.spyOn(searchAi, "parseIntentWithOpenAI").mockRejectedValue(
      new Error("should not call OpenAI"),
    );

    const query =
      "looking for a place to grab coffee that has treats for kids. Rosemary Beach. Bakery item";
    const normalized = query.toLowerCase();
    const themes = detectQueryThemes(query);

    const result = await resolveAskSearchIntent({
      verbatimQuery: query,
      normalized,
      themes,
      toolCategorySlug: null,
      townOrArea: "Rosemary Beach",
      vibeTags: ["kid_friendly"],
      model: "gpt-4o-mini",
      openaiKey: "test-key",
    });

    expect(result.intentSource).toBe("facet_plan");
    expect(result.intent.category).toBe("coffee_shops");
    expect(result.intent.location?.town).toBe("Rosemary Beach");
    expect(parseSpy).not.toHaveBeenCalled();
    parseSpy.mockRestore();
  });
});
