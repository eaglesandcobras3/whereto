import type { CsvRow } from "./csv";

export function buildGeminiAuditPrompt(row: CsvRow, allowed: {
  towns: string[];
  areas: string[];
  categories: string[];
}): string {
  return `Verify this Florida 30A / South Walton business directory listing with Google Search.
Treat the current fields as UNTRUSTWORTHY (many were invented by ChatGPT).

Current listing:
- id: ${row.id}
- title: ${row.title}
- town: ${row.town || "(none)"}
- area: ${row.area || "(none)"}
- category: ${row.category || "(none)"}
- storefront: ${row.is_storefront} | service: ${row.is_service_business}
- address: ${row.location || "(none)"}
- phone: ${row.phone || "(none)"}
- website: ${row.website || "(none)"}

Step 1 — Search Google (required):
Search the business name with 30A, Santa Rosa Beach, Walton County, South Walton, and the listed town.
Write 4-6 short bullets covering: exists or not, street address, phone, website, and source URLs.
Never answer from memory. If you cannot confirm a real matching business in this area, say so.

Step 2 — After the bullets, output ONE fenced \`\`\`json code block with this exact shape (all string fields; location is a single address string, not an object):
{
  "status": "exists" | "closed" | "cannot_confirm",
  "confidence": "high" | "medium" | "low",
  "title": "",
  "town": "",
  "area": "",
  "category": "",
  "location": "",
  "phone": "",
  "website": "",
  "excerpt": "",
  "overview": "",
  "seo_title": "",
  "seo_description": "",
  "search_keywords": "",
  "suggested_tags": ["", "", ""],
  "notes": "",
  "sources": ["https://..."]
}

Field rules for the JSON:
- status=exists only if a current public source shows this real business in the 30A / South Walton area.
- status=closed if sources show it permanently closed or replaced.
- status=cannot_confirm if you cannot find a matching real business. Do not guess.
- If exists: phone, website, and location ONLY from sources; use "" when unknown.
- town must be one of: ${allowed.towns.join(" | ") || "(none)"}
- area must be one of (or ""): ${allowed.areas.join(" | ") || "(none)"}
- category must be one of: ${allowed.categories.join(" | ") || "(none)"}
- suggested_tags: up to 10 short phrases for what this place is (food type, vibe, activity, service). Freeform is fine — we match them to our vocabulary later. Prefer concrete words like "seafood", "ice cream", "family friendly", "bike rentals". Empty array if cannot_confirm/closed.
- Do NOT invent a final search_tags list — only suggested_tags.
- Copy is a directory blurb, third person, warm and local. No first person. No em dashes. No "best on 30A".
- excerpt max 160 chars; overview max 500 chars; seo_title max 60; seo_description max 160.
- Do not return latitude or longitude.`;
}
