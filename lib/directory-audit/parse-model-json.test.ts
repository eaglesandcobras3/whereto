import { describe, expect, it } from "vitest";
import {
  extractJsonObject,
  firstCandidateText,
  groundingSourceUrls,
  hadGoogleSearch,
  parseGeminiAuditProposal,
} from "./parse-model-json";

describe("extractJsonObject", () => {
  it("reads a fenced JSON object", () => {
    const raw = 'Here you go:\n```json\n{"status":"cannot_confirm","notes":"no match"}\n```\n';
    expect(extractJsonObject(raw)).toEqual({ status: "cannot_confirm", notes: "no match" });
  });

  it("reads the first object when prose surrounds it", () => {
    expect(extractJsonObject('Sure. {"status":"closed"} thanks')).toEqual({ status: "closed" });
  });
});

describe("parseGeminiAuditProposal", () => {
  it("requires copy when status is exists", () => {
    expect(() =>
      parseGeminiAuditProposal(
        JSON.stringify({
          status: "exists",
          title: "Bud & Alley's",
          excerpt: "",
          overview: "",
          seo_title: "",
          seo_description: "",
        }),
      ),
    ).toThrow(/missing excerpt/);
  });

  it("accepts cannot_confirm without copy", () => {
    const parsed = parseGeminiAuditProposal(
      JSON.stringify({ status: "cannot_confirm", notes: "No sources" }),
    );
    expect(parsed.status).toBe("cannot_confirm");
    expect(parsed.excerpt).toBe("");
  });

  it("accepts numeric confidence and object location", () => {
    const parsed = parseGeminiAuditProposal(
      JSON.stringify({
        status: "cannot_confirm",
        confidence: 0.95,
        location: { address: "1 Main", city: "Seaside", state: "FL", zip: "32459" },
        notes: "x",
      }),
    );
    expect(parsed.confidence).toBe("high");
    expect(parsed.location).toBe("1 Main, Seaside, FL, 32459");
  });
});

describe("grounding metadata", () => {
  const payload = {
    candidates: [
      {
        content: { parts: [{ text: '{"status":"exists"}' }] },
        groundingMetadata: {
          webSearchQueries: ["bud and alleys seaside"],
          groundingChunks: [{ web: { uri: "https://example.com/a" } }, { web: { uri: "https://example.com/a" } }],
        },
      },
    ],
  };

  it("detects a Google Search call", () => {
    expect(hadGoogleSearch(payload)).toBe(true);
    expect(hadGoogleSearch({ candidates: [{}] })).toBe(false);
  });

  it("dedupes source URLs and reads text", () => {
    expect(groundingSourceUrls(payload)).toEqual(["https://example.com/a"]);
    expect(firstCandidateText(payload)).toBe('{"status":"exists"}');
  });
});
