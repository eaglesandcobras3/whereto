import type { IrseInput } from "./inputs";
import { buildScoreResult, mergeCategoryResults } from "./aggregate";
import { computeConfidence } from "./confidence";
import { pathForKind } from "./paths";
import type { CategoryScores, ScoreResult } from "./types";
import {
  scoreBusinessContent,
  scoreBusinessDiscovery,
  scoreBusinessEntity,
  scoreBusinessSeo,
  scoreBusinessTrust,
} from "./score/business";
import {
  scoreGuideContent,
  scoreGuideDiscovery,
  scoreGuideEntity,
  scoreGuideSeo,
  scoreGuideTrust,
} from "./score/guide";
import {
  scoreTownContent,
  scoreTownDiscovery,
  scoreTownEntity,
  scoreTownSeo,
  scoreTownTrust,
} from "./score/town";
import {
  scoreAreaContent,
  scoreAreaDiscovery,
  scoreAreaEntity,
  scoreAreaSeo,
  scoreAreaTrust,
} from "./score/area";
import {
  scoreCategoryContent,
  scoreCategoryDiscovery,
  scoreCategoryEntity,
  scoreCategorySeo,
  scoreCategoryTrust,
} from "./score/category";

export function scoreFromInput(
  input: IrseInput,
  options?: {
    indexedPeerCentroid?: CategoryScores | null;
    indexedPeerCount?: number;
  },
): ScoreResult {
  const parts = categoryPartsFor(input);
  const merged = mergeCategoryResults(parts);
  const confidence = computeConfidence({
    dataCompleteness: merged.meanCompleteness,
    scores: merged.scores,
    indexedPeerCentroid: options?.indexedPeerCentroid,
    indexedPeerCount: options?.indexedPeerCount,
  });

  const path =
    input.kind === "category" ? input.public_path : pathForKind(input.kind, input.slug);

  return buildScoreResult({
    kind: input.kind,
    slug: input.slug,
    path,
    scores: merged.scores,
    overallScore: merged.overallScore,
    flags: merged.flags,
    recommendations: merged.recommendations,
    confidence,
  });
}

function categoryPartsFor(input: IrseInput) {
  switch (input.kind) {
    case "business":
      return {
        entity: scoreBusinessEntity(input),
        content: scoreBusinessContent(input),
        seo: scoreBusinessSeo(input),
        discovery: scoreBusinessDiscovery(input),
        trust: scoreBusinessTrust(input),
      };
    case "guide":
      return {
        entity: scoreGuideEntity(input),
        content: scoreGuideContent(input),
        seo: scoreGuideSeo(input),
        discovery: scoreGuideDiscovery(input),
        trust: scoreGuideTrust(input),
      };
    case "town":
      return {
        entity: scoreTownEntity(input),
        content: scoreTownContent(input),
        seo: scoreTownSeo(input),
        discovery: scoreTownDiscovery(input),
        trust: scoreTownTrust(input),
      };
    case "area":
      return {
        entity: scoreAreaEntity(input),
        content: scoreAreaContent(input),
        seo: scoreAreaSeo(input),
        discovery: scoreAreaDiscovery(input),
        trust: scoreAreaTrust(input),
      };
    case "category":
      return {
        entity: scoreCategoryEntity(input),
        content: scoreCategoryContent(input),
        seo: scoreCategorySeo(input),
        discovery: scoreCategoryDiscovery(input),
        trust: scoreCategoryTrust(input),
      };
  }
}
