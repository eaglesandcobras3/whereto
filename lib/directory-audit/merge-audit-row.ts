import {
  FREE_ONBOARD_EXCERPT_MAX,
  FREE_ONBOARD_OVERVIEW_MAX,
  FREE_ONBOARD_SEARCH_KEYWORDS_MAX,
  FREE_ONBOARD_TITLE_MAX,
} from "@/lib/listing-requests/free-onboard-schema";
import { formatAuditTags } from "./assign-tags-from-text";
import type { CsvRow } from "./csv";
import type { AllowedVocab, GeminiAuditProposal } from "./types";

const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 160;

function clip(value: string, max: number): string {
  const t = value.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim();
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickAllowed(value: string, allowed: Set<string>): string {
  const raw = value.trim();
  if (!raw) return "";
  const byExact = new Map([...allowed].map((v) => [v, v]));
  if (byExact.has(raw)) return byExact.get(raw) ?? raw;
  const byNorm = new Map([...allowed].map((v) => [normalizeKey(v), v]));
  return byNorm.get(normalizeKey(raw)) ?? "";
}

function looksLikeHttpUrl(value: string): string {
  const t = value.trim();
  if (!t) return "";
  try {
    const url = new URL(t.startsWith("http") ? t : `https://${t}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function skippedVerifiedRow(input: CsvRow): CsvRow {
  return {
    ...input,
    audit_status: "skipped_verified",
    audit_confidence: "",
    audit_sources: "",
    audit_notes: "Verified listing: content left unchanged.",
    audit_suggested_tags: "",
  };
}

export function errorAuditRow(input: CsvRow, message: string): CsvRow {
  return {
    ...input,
    audit_status: "error",
    audit_confidence: "",
    audit_sources: "",
    audit_notes: message.slice(0, 500),
    audit_suggested_tags: "",
  };
}

export function mergeAuditRow(
  input: CsvRow,
  proposal: GeminiAuditProposal,
  allowed: AllowedVocab,
  extraSources: string[] = [],
): CsvRow {
  const sources = [...proposal.sources, ...extraSources]
    .map((s) => s.trim())
    .filter(Boolean);
  const uniqueSources = [...new Set(sources)];
  const suggested = formatAuditTags(proposal.suggested_tags.slice(0, 10));
  const base: CsvRow = {
    ...input,
    audit_status: proposal.status,
    audit_confidence: proposal.confidence,
    audit_sources: uniqueSources.join(" | "),
    audit_notes: proposal.notes,
    audit_suggested_tags: suggested,
  };

  if (proposal.status !== "exists") {
    return base;
  }

  const town = pickAllowed(proposal.town, allowed.towns) || input.town;
  const area = pickAllowed(proposal.area, allowed.areas);
  const category = pickAllowed(proposal.category, allowed.categories) || input.category;
  const website = looksLikeHttpUrl(proposal.website);

  return {
    ...base,
    title: clip(proposal.title || input.title, FREE_ONBOARD_TITLE_MAX),
    town,
    area: area || input.area,
    category,
    // Final search_tags come from assign-business-audit-tags.ts (match suggestions → vocab).
    search_tags: input.search_tags ?? "",
    location: proposal.location.trim(),
    phone: proposal.phone.trim(),
    website,
    excerpt: clip(proposal.excerpt, FREE_ONBOARD_EXCERPT_MAX),
    overview: clip(proposal.overview, FREE_ONBOARD_OVERVIEW_MAX),
    seo_title: clip(proposal.seo_title, SEO_TITLE_MAX),
    seo_description: clip(proposal.seo_description, SEO_DESCRIPTION_MAX),
    search_keywords: clip(proposal.search_keywords, FREE_ONBOARD_SEARCH_KEYWORDS_MAX),
    map_lat: input.map_lat ?? "",
    map_lng: input.map_lng ?? "",
  };
}

export function uniqueNonEmpty(values: string[]): Set<string> {
  return new Set(values.map((v) => v.trim()).filter(Boolean));
}
