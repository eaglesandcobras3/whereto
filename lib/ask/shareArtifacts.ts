import { nanoid } from "nanoid";
import type {
  AreaResultsArtifact,
  AskArtifact,
  BusinessResultsArtifact,
  GuideResultsArtifact,
  TownResultsArtifact,
} from "@/lib/ask/types";

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return base || "recommendations";
}

export function generateShareSlug(title: string): string {
  const suffix = nanoid(6).toLowerCase();
  return `${slugifyTitle(title)}-${suffix}`;
}

/** Template summary from verified card fields only — no invented facts. */
export function generateArtifactSummary(artifact: AskArtifact): string {
  if (artifact.type === "business_results") {
    return summarizeBusinessResults(artifact);
  }
  if (artifact.type === "guide_results") {
    return summarizeGuideResults(artifact);
  }
  if (artifact.type === "town_results") {
    return summarizeTownResults(artifact);
  }
  if (artifact.type === "area_results") {
    return summarizeAreaResults(artifact);
  }
  return "";
}

function summarizeBusinessResults(a: BusinessResultsArtifact): string {
  const lines = a.results.slice(0, 8).map((r) => {
    const place = r.town_or_area ? ` (${r.town_or_area})` : "";
    return `• ${r.title}${place}: ${r.why_this_matched}`;
  });
  const intro = a.title ? `${a.title}:\n` : "";
  const outro =
    a.results.length > 3
      ? "\n\nA mix of options depending on what you're looking for."
      : "";
  return `${intro}${lines.join("\n")}${outro}`.trim();
}

function summarizeGuideResults(a: GuideResultsArtifact): string {
  const lines = a.results.slice(0, 6).map((g) => `• ${g.title}${g.excerpt ? `: ${g.excerpt}` : ""}`);
  return `${a.title}:\n${lines.join("\n")}`.trim();
}

function summarizeTownResults(a: TownResultsArtifact): string {
  const lines = a.results.slice(0, 6).map((t) => {
    const region = t.region ? ` (${t.region})` : "";
    return `• ${t.title}${region}${t.excerpt ? `: ${t.excerpt}` : ""}`;
  });
  return `${a.title}:\n${lines.join("\n")}`.trim();
}

function summarizeAreaResults(a: AreaResultsArtifact): string {
  const lines = a.results.slice(0, 6).map((ar) => {
    const kind = ar.area_type ? ` [${ar.area_type}]` : "";
    return `• ${ar.title}${kind}${ar.excerpt ? `: ${ar.excerpt}` : ""}`;
  });
  return `${a.title}:\n${lines.join("\n")}`.trim();
}

export function artifactShareTitle(artifact: AskArtifact): string {
  if (artifact.type === "business_results") return artifact.title;
  if (artifact.type === "guide_results") return artifact.title;
  if (artifact.type === "town_results") return artifact.title;
  if (artifact.type === "area_results") return artifact.title;
  return "WhereTo30A recommendations";
}
