import { z } from "zod";
import type { GeminiAuditProposal } from "./types";

const emptyToBlank = z
  .union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return "";
    return String(v).trim();
  });

const locationField = z
  .union([z.string(), z.number(), z.record(z.string(), z.unknown()), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return "";
    if (typeof v === "string" || typeof v === "number") return String(v).trim();
    const obj = v as Record<string, unknown>;
    const parts = [
      obj.address ?? obj.street ?? obj.line1,
      obj.city,
      obj.state,
      obj.zip ?? obj.postal_code ?? obj.postal,
    ]
      .map((p) => (p == null ? "" : String(p).trim()))
      .filter(Boolean);
    return parts.join(", ");
  });

const confidenceField = z
  .union([z.enum(["high", "medium", "low"]), z.number(), z.string(), z.null(), z.undefined()])
  .transform((v): "high" | "medium" | "low" => {
    if (v == null) return "medium";
    if (v === "high" || v === "medium" || v === "low") return v;
    if (typeof v === "number") {
      if (v >= 0.8) return "high";
      if (v >= 0.5) return "medium";
      return "low";
    }
    const s = String(v).toLowerCase();
    if (s.includes("high")) return "high";
    if (s.includes("low")) return "low";
    return "medium";
  });

const suggestionList = z
  .union([z.array(z.union([z.string(), z.number()])), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return [] as string[];
    const parts = Array.isArray(v)
      ? v.map((t) => String(t).trim()).filter(Boolean)
      : v
          .split(/\s*\|\s*|\s*,\s*/)
          .map((t) => t.trim())
          .filter(Boolean);
    return parts.slice(0, 10);
  });

const sourceList = z
  .union([z.array(z.string()), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return [] as string[];
    if (Array.isArray(v)) return v.map((t) => String(t).trim()).filter(Boolean);
    return v
      .split(/\s*\|\s*|\s*,\s*/)
      .map((t) => t.trim())
      .filter(Boolean);
  });

export const geminiAuditProposalSchema = z.object({
  status: z.enum(["exists", "closed", "cannot_confirm"]),
  confidence: confidenceField,
  title: emptyToBlank,
  town: emptyToBlank,
  area: emptyToBlank,
  category: emptyToBlank,
  location: locationField,
  phone: emptyToBlank,
  website: emptyToBlank,
  excerpt: emptyToBlank,
  overview: emptyToBlank,
  seo_title: emptyToBlank,
  seo_description: emptyToBlank,
  search_keywords: emptyToBlank,
  suggested_tags: suggestionList,
  notes: emptyToBlank,
  sources: sourceList,
});

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? trimmed).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain a JSON object");
  }
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

export function parseGeminiAuditProposal(text: string): GeminiAuditProposal {
  const parsed = geminiAuditProposalSchema.parse(extractJsonObject(text));
  if (parsed.status === "exists") {
    if (!parsed.excerpt || !parsed.overview || !parsed.seo_title || !parsed.seo_description) {
      throw new Error("exists status is missing excerpt, overview, or SEO copy");
    }
  }
  return parsed;
}

export function groundingSourceUrls(payload: unknown): string[] {
  const candidate = (payload as { candidates?: Array<{ groundingMetadata?: unknown }> })
    ?.candidates?.[0];
  const meta = candidate?.groundingMetadata as
    | {
        groundingChunks?: Array<{ web?: { uri?: string } }>;
        groundingSupports?: Array<{ groundingChunkIndices?: number[] }>;
      }
    | undefined;
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const chunk of meta?.groundingChunks ?? []) {
    const uri = chunk.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    urls.push(uri);
  }
  return urls;
}

export function hadGoogleSearch(payload: unknown): boolean {
  const candidate = (payload as { candidates?: Array<{ groundingMetadata?: unknown }> })
    ?.candidates?.[0];
  const meta = candidate?.groundingMetadata as { webSearchQueries?: unknown } | undefined;
  if (Array.isArray(meta?.webSearchQueries) && meta.webSearchQueries.length > 0) return true;
  return groundingSourceUrls(payload).length > 0;
}

export function firstCandidateText(payload: unknown): string {
  const parts = (
    payload as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    }
  )?.candidates?.[0]?.content?.parts;
  return (parts ?? [])
    .map((p) => p.text ?? "")
    .join("\n")
    .trim();
}
