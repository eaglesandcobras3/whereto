import { describe, expect, it } from "vitest";
import { resolveQueryPlan } from "@/lib/search/resolve-query-plan";

// ── Collision pairs: substring_collision class ────────────────────────────────

describe("collision_mobility_rental vs collision_golf_activity", () => {
  it("routes 'golf carts' to mobility_rental, not golf courses", () => {
    const plan = resolveQueryPlan("golf carts");
    expect(plan.matchedRuleId).toBe("collision_mobility_rental");
    expect(plan.requiredTags).toContain("mobility_rental");
    expect(plan.categorySlug).toBe("activities");
  });

  it("routes 'golf cart' (singular) to mobility_rental", () => {
    const plan = resolveQueryPlan("golf cart");
    expect(plan.matchedRuleId).toBe("collision_mobility_rental");
    expect(plan.requiredTags).toContain("mobility_rental");
  });

  it("routes 'cart rental' to mobility_rental", () => {
    const plan = resolveQueryPlan("cart rental near rosemary");
    expect(plan.matchedRuleId).toBe("collision_mobility_rental");
    expect(plan.requiredTags).toContain("mobility_rental");
  });

  it("routes 'golf course tee time' to golf activity, NOT mobility_rental", () => {
    const plan = resolveQueryPlan("golf course tee time");
    expect(plan.matchedRuleId).toBe("collision_golf_activity");
    expect(plan.requiredTags).toContain("golf");
    expect(plan.requiredTags).not.toContain("mobility_rental");
  });

  it("routes 'tee time' to golf activity", () => {
    const plan = resolveQueryPlan("tee time");
    expect(plan.matchedRuleId).toBe("collision_golf_activity");
    expect(plan.requiredTags).toContain("golf");
  });

  it("bare 'golf' does NOT match either collision rule (no phrase match)", () => {
    // 'golf' alone is not in either rule's phrases list — falls through to FTS
    const plan = resolveQueryPlan("golf");
    expect(plan.matchedRuleId).toBeNull();
    expect(plan.requiredTags).toHaveLength(0);
  });
});

describe("collision_books_retail", () => {
  it("routes 'bookstore' to books tag in specialty_retail", () => {
    const plan = resolveQueryPlan("bookstore");
    expect(plan.matchedRuleId).toBe("collision_books_retail");
    expect(plan.requiredTags).toContain("books");
    expect(plan.categorySlug).toBe("specialty_retail");
  });

  it("routes 'bookstore books reading' to books tag", () => {
    const plan = resolveQueryPlan("bookstore books reading");
    expect(plan.matchedRuleId).toBe("collision_books_retail");
    expect(plan.requiredTags).toContain("books");
  });

  it("routes bare 'books' to books tag", () => {
    const plan = resolveQueryPlan("books");
    expect(plan.matchedRuleId).toBe("collision_books_retail");
    expect(plan.requiredTags).toContain("books");
  });
});

// ── Category keywords ─────────────────────────────────────────────────────────

describe("category_coffee", () => {
  it("routes 'coffee' to coffee_shops", () => {
    const plan = resolveQueryPlan("coffee");
    expect(plan.matchedRuleId).toBe("category_coffee");
    expect(plan.categorySlug).toBe("coffee_shops");
  });

  it("routes 'morning coffee latte cappuccino' to coffee_shops", () => {
    const plan = resolveQueryPlan("morning coffee latte cappuccino");
    expect(plan.matchedRuleId).toBe("category_coffee");
    expect(plan.categorySlug).toBe("coffee_shops");
  });

  it("routes 'coffee in rosemary beach' to coffee_shops", () => {
    const plan = resolveQueryPlan("coffee in rosemary beach");
    expect(plan.matchedRuleId).toBe("category_coffee");
    expect(plan.categorySlug).toBe("coffee_shops");
  });
});

// ── Explicit overrides always win ────────────────────────────────────────────

describe("explicit overrides", () => {
  it("explicit categorySlug overrides rule-derived categorySlug", () => {
    const plan = resolveQueryPlan("golf carts", { categorySlug: "restaurants" });
    expect(plan.categorySlug).toBe("restaurants");
    // requiredTags still come from the rule
    expect(plan.requiredTags).toContain("mobility_rental");
  });

  it("explicit townSlug is set from caller, not rule", () => {
    const plan = resolveQueryPlan("coffee", { townSlug: "rosemary-beach" });
    expect(plan.townSlug).toBe("rosemary-beach");
    expect(plan.categorySlug).toBe("coffee_shops");
  });
});

describe("category_remote_work", () => {
  it("routes laptop wifi queries to coffee_shops", () => {
    const plan = resolveQueryPlan("best place to work remote laptop wifi");
    expect(plan.matchedRuleId).toBe("category_remote_work");
    expect(plan.categorySlug).toBe("coffee_shops");
  });

  it("routes work with laptop and wifi variant", () => {
    const plan = resolveQueryPlan("best place to work with laptop and wifi");
    expect(plan.matchedRuleId).toBe("category_remote_work");
    expect(plan.categorySlug).toBe("coffee_shops");
  });
});

describe("category_ice_cream", () => {
  it("routes ice cream shop queries to ice_cream category", () => {
    const plan = resolveQueryPlan("ice cream shop");
    expect(plan.matchedRuleId).toBe("category_ice_cream");
    expect(plan.categorySlug).toBe("ice_cream");
    expect(plan.searchTerms).toContain("ice cream");
  });
});

describe("category_donut_shops", () => {
  it("routes donut queries to donut_shops category", () => {
    const plan = resolveQueryPlan("donuts near rosemary beach");
    expect(plan.matchedRuleId).toBe("category_donut_shops");
    expect(plan.categorySlug).toBe("donut_shops");
    expect(plan.searchTerms).toContain("donuts");
  });
});

describe("category_candy_sweets", () => {
  it("routes candy shop queries to candy_sweets category", () => {
    const plan = resolveQueryPlan("candy shop");
    expect(plan.matchedRuleId).toBe("category_candy_sweets");
    expect(plan.categorySlug).toBe("candy_sweets");
  });
});

describe("category_sweet_treats_generic", () => {
  it("routes generic sweet treat queries with no hard category filter", () => {
    const plan = resolveQueryPlan("something sweet dessert treat");
    expect(plan.matchedRuleId).toBe("category_sweet_treats_generic");
    expect(plan.categorySlug).toBeNull();
  });
});

describe("category_sunset_drinks", () => {
  it("routes sunset drinks to restaurants", () => {
    const plan = resolveQueryPlan("best place to watch the sunset with drinks");
    expect(plan.matchedRuleId).toBe("category_sunset_drinks");
    expect(plan.categorySlug).toBe("restaurants");
  });
});

describe("category_wine_bar", () => {
  it("routes wine bar without forcing bars-only category", () => {
    const plan = resolveQueryPlan("wine bar cocktails");
    expect(plan.matchedRuleId).toBe("category_wine_bar");
    expect(plan.categorySlug).toBeNull();
  });
});

describe("category_shopping_boutiques", () => {
  it("routes girls trip shopping to boutiques subcategory", () => {
    const plan = resolveQueryPlan("girls trip shopping boutiques");
    expect(plan.matchedRuleId).toBe("category_shopping_boutiques");
    expect(plan.categorySlug).toBe("boutiques");
  });

  it("routes bare 'boutique' to boutiques", () => {
    const plan = resolveQueryPlan("boutique");
    expect(plan.matchedRuleId).toBe("category_shopping_boutiques");
    expect(plan.categorySlug).toBe("boutiques");
  });
});

describe("category_footwear", () => {
  it("routes shoe queries to dedicated footwear category", () => {
    const plan = resolveQueryPlan("shoes sandals footwear");
    expect(plan.matchedRuleId).toBe("category_footwear");
    expect(plan.categorySlug).toBe("footwear");
  });
});

describe("category_jewelry", () => {
  it("routes jewelry boutique queries to dedicated jewelry category", () => {
    const plan = resolveQueryPlan("jewelry boutique accessories");
    expect(plan.matchedRuleId).toBe("category_jewelry");
    expect(plan.categorySlug).toBe("jewelry");
  });
});

describe("collision_books_retail (subcategory update)", () => {
  it("routes bookstore to specialty_retail", () => {
    const plan = resolveQueryPlan("bookstore");
    expect(plan.matchedRuleId).toBe("collision_books_retail");
    expect(plan.categorySlug).toBe("specialty_retail");
    expect(plan.requiredTags).toContain("books");
  });
});

describe("category_breakfast_brunch", () => {
  it("routes breakfast queries via anyTags filter (no categorySlug — spans restaurants + coffee_shops)", () => {
    const plan = resolveQueryPlan("best place for breakfast");
    expect(plan.matchedRuleId).toBe("category_breakfast_brunch");
    expect(plan.categorySlug).toBeNull();
    expect(plan.anyTags).toContain("breakfast");
    expect(plan.searchTerms).toContain("breakfast");
  });

  it("routes brunch queries via anyTags filter", () => {
    const plan = resolveQueryPlan("brunch spot rosemary beach");
    expect(plan.matchedRuleId).toBe("category_breakfast_brunch");
    expect(plan.categorySlug).toBeNull();
    expect(plan.anyTags).toContain("brunch");
  });

  it("does not match 'lunch' (only breakfast and brunch trigger the rule)", () => {
    const plan = resolveQueryPlan("lunch near watercolor");
    expect(plan.matchedRuleId).toBeNull();
  });
});

describe("category_fitness", () => {
  it("routes yoga fitness studio to fitness (not activities)", () => {
    const plan = resolveQueryPlan("yoga fitness studio");
    expect(plan.matchedRuleId).toBe("category_fitness");
    expect(plan.categorySlug).toBe("fitness");
    expect(plan.serviceCategorySlug).toBeNull();
  });
});

describe("collision_books_retail conversational", () => {
  it("routes find a good book to books rule", () => {
    const plan = resolveQueryPlan("where can I find a good book");
    expect(plan.matchedRuleId).toBe("collision_books_retail");
    expect(plan.requiredTags).toEqual(["books"]);
  });
});

describe("category_photography_services", () => {
  it("routes photography studio to photography", () => {
    const plan = resolveQueryPlan("photography studio portraits");
    expect(plan.matchedRuleId).toBe("category_photography_services");
    expect(plan.categorySlug).toBe("photography");
  });

  it("routes vacation photos to photography", () => {
    const plan = resolveQueryPlan("vacation photos family shoot");
    expect(plan.matchedRuleId).toBe("category_photography_services");
    expect(plan.categorySlug).toBe("photography");
  });
});

describe("category_massage_spa", () => {
  it("routes massage queries to spas (not the broad services bucket)", () => {
    const plan = resolveQueryPlan("deep tissue massage");
    expect(plan.matchedRuleId).toBe("category_massage_spa");
    expect(plan.categorySlug).toBe("spas");
  });
});

describe("category_hair_salon", () => {
  it("routes hair salon queries to hair_salons", () => {
    const plan = resolveQueryPlan("hair salon blowout styling");
    expect(plan.matchedRuleId).toBe("category_hair_salon");
    expect(plan.categorySlug).toBe("hair_salons");
  });
});

describe("category_nail_salon", () => {
  it("routes nail salon queries to nail_salons", () => {
    const plan = resolveQueryPlan("nail salon manicure pedicure");
    expect(plan.matchedRuleId).toBe("category_nail_salon");
    expect(plan.categorySlug).toBe("nail_salons");
  });
});

describe("category_hvac_plumbing", () => {
  it("routes plumber queries to hvac_plumbing", () => {
    const plan = resolveQueryPlan("plumber for leaky pipe");
    expect(plan.matchedRuleId).toBe("category_hvac_plumbing");
    expect(plan.categorySlug).toBe("hvac_plumbing");
  });
});

describe("category_pest_control", () => {
  it("routes exterminator queries to pest_control", () => {
    const plan = resolveQueryPlan("pest control exterminator");
    expect(plan.matchedRuleId).toBe("category_pest_control");
    expect(plan.categorySlug).toBe("pest_control");
  });
});

describe("category_landscaping", () => {
  it("routes lawn care queries to landscaping", () => {
    const plan = resolveQueryPlan("lawn care service");
    expect(plan.matchedRuleId).toBe("category_landscaping");
    expect(plan.categorySlug).toBe("landscaping");
  });
});

describe("category_cleaning_services", () => {
  it("routes house cleaning queries to cleaning_services", () => {
    const plan = resolveQueryPlan("vacation rental cleaning service");
    expect(plan.matchedRuleId).toBe("category_cleaning_services");
    expect(plan.categorySlug).toBe("cleaning_services");
  });
});

describe("category_real_estate", () => {
  it("routes realtor queries to real_estate", () => {
    const plan = resolveQueryPlan("real estate agent");
    expect(plan.matchedRuleId).toBe("category_real_estate");
    expect(plan.categorySlug).toBe("real_estate");
  });
});

describe("category_legal_services", () => {
  it("routes attorney queries to legal_services", () => {
    const plan = resolveQueryPlan("attorney for legal advice");
    expect(plan.matchedRuleId).toBe("category_legal_services");
    expect(plan.categorySlug).toBe("legal_services");
  });
});

describe("category_insurance", () => {
  it("routes insurance agent queries to insurance", () => {
    const plan = resolveQueryPlan("homeowners insurance agent");
    expect(plan.matchedRuleId).toBe("category_insurance");
    expect(plan.categorySlug).toBe("insurance");
  });
});

describe("category_title_escrow", () => {
  it("routes title company queries to title_escrow", () => {
    const plan = resolveQueryPlan("title company for closing");
    expect(plan.matchedRuleId).toBe("category_title_escrow");
    expect(plan.categorySlug).toBe("title_escrow");
  });
});

describe("category_dental", () => {
  it("routes dentist queries to dental_orthodontics", () => {
    const plan = resolveQueryPlan("dentist for teeth cleaning");
    expect(plan.matchedRuleId).toBe("category_dental");
    expect(plan.categorySlug).toBe("dental_orthodontics");
  });
});

describe("category_dermatology", () => {
  it("routes dermatologist queries to dermatology_skin", () => {
    const plan = resolveQueryPlan("dermatologist skin clinic");
    expect(plan.matchedRuleId).toBe("category_dermatology");
    expect(plan.categorySlug).toBe("dermatology_skin");
  });
});

describe("category_chiropractic", () => {
  it("routes chiropractor queries to chiropractic_wellness", () => {
    const plan = resolveQueryPlan("chiropractor for back pain");
    expect(plan.matchedRuleId).toBe("category_chiropractic");
    expect(plan.categorySlug).toBe("chiropractic_wellness");
  });
});

describe("category_medical_clinic", () => {
  it("routes urgent care queries to medical_clinics", () => {
    const plan = resolveQueryPlan("urgent care medical clinic");
    expect(plan.matchedRuleId).toBe("category_medical_clinic");
    expect(plan.categorySlug).toBe("medical_clinics");
  });
});

describe("category_home_repair", () => {
  it("routes handyman queries to contractors_handyman", () => {
    const plan = resolveQueryPlan("handyman for home repair");
    expect(plan.matchedRuleId).toBe("category_home_repair");
    expect(plan.categorySlug).toBe("contractors_handyman");
  });
});

describe("category_water_charters", () => {
  it("routes fishing charter via searchTerms (no category — activities is too broad)", () => {
    const plan = resolveQueryPlan("fishing charter boat trip");
    expect(plan.matchedRuleId).toBe("category_water_charters");
    expect(plan.categorySlug).toBeNull();
    expect(plan.searchTerms).toContain("charter");
  });

  it("routes dolphin cruise via searchTerms", () => {
    const plan = resolveQueryPlan("dolphin cruise boat tour");
    expect(plan.matchedRuleId).toBe("category_water_charters");
    expect(plan.categorySlug).toBeNull();
    expect(plan.searchTerms).toContain("boat");
  });

  it("routes paddle board rental via searchTerms", () => {
    const plan = resolveQueryPlan("surf shop paddle board rental");
    expect(plan.matchedRuleId).toBe("category_water_charters");
    expect(plan.categorySlug).toBeNull();
    expect(plan.searchTerms).toContain("rental");
  });
});

// ── No-match fallback ────────────────────────────────────────────────────────

describe("no rule match — FTS fallback", () => {
  it("romantic waterfront dinner now matches waterfront dining rule", () => {
    const plan = resolveQueryPlan("romantic waterfront dinner");
    expect(plan.matchedRuleId).toBe("category_waterfront_dining");
    expect(plan.categorySlug).toBe("restaurants");
  });

  it("private chef query falls through with service category from explicit", () => {
    const plan = resolveQueryPlan("private chef catering", {
      serviceCategorySlug: "private_chef",
    });
    expect(plan.matchedRuleId).toBeNull();
    expect(plan.serviceCategorySlug).toBe("private_chef");
  });
});

// ── Longest-phrase-wins ───────────────────────────────────────────────────────

describe("longest phrase wins", () => {
  it("'golf carts' matches collision_mobility_rental not collision_golf_activity", () => {
    // Both rules have phrases containing 'golf'. 'golf carts' (10 chars) beats 'golf course' (11)
    // but 'golf carts' also beats any rule whose phrase length < 'golf carts'.
    // collision_mobility_rental phrases include 'golf cart' (9) and 'golf carts' (10).
    // collision_golf_activity phrases include 'golf course' (11), 'tee time' (8), etc.
    // For query "golf carts": 'golf carts' (len 10) matches mobility_rental before
    // shorter phrases from golf_activity can match.
    const plan = resolveQueryPlan("golf carts rental on 30a");
    expect(plan.matchedRuleId).toBe("collision_mobility_rental");
  });
});
