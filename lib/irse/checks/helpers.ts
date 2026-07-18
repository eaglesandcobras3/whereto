import type { CategoryCheckResult, CheckContribution, IrseFlag } from "../types";
import { sumCheckContributions } from "../aggregate";

export function present(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function textLen(...parts: Array<string | null | undefined>): number {
  return parts.reduce((n, p) => n + (p?.trim().length ?? 0), 0);
}

export function wordCount(...parts: Array<string | null | undefined>): number {
  const text = parts
    .map((p) => p?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function hasImage(fields: {
  hero_image?: string | null;
  main_image?: string | null;
  hero_image_url?: string | null;
  main_image_url?: string | null;
}): boolean {
  return Boolean(
    fields.hero_image?.trim() ||
      fields.main_image?.trim() ||
      fields.hero_image_url?.trim() ||
      fields.main_image_url?.trim(),
  );
}

export function metaLengthOk(value: string | null | undefined, min: number, max: number): boolean {
  const len = value?.trim().length ?? 0;
  return len >= min && len <= max;
}

export function countGenericAiPhrases(text: string, phrases: readonly string[]): number {
  const lower = text.toLowerCase();
  let n = 0;
  for (const phrase of phrases) {
    if (lower.includes(phrase)) n += 1;
  }
  return n;
}

export function pass(
  max: number,
  ok: boolean,
  flag?: IrseFlag,
  recommendation?: string,
): CheckContribution {
  return {
    points: ok ? max : 0,
    max,
    applicable: true,
    flag: ok ? undefined : flag,
    recommendation: ok ? undefined : recommendation,
  };
}

export function partial(
  max: number,
  points: number,
  flag?: IrseFlag,
  recommendation?: string,
): CheckContribution {
  return {
    points: Math.max(0, Math.min(max, points)),
    max,
    applicable: true,
    flag,
    recommendation,
  };
}

/** Check has no data model — partial credit + info flag. */
export function unavailable(
  max: number,
  creditRatio: number,
  flag: IrseFlag,
  recommendation?: string,
): CheckContribution {
  return {
    points: Math.round(max * creditRatio),
    max,
    applicable: true,
    flag,
    recommendation,
  };
}

export function fromContributions(contributions: CheckContribution[]): CategoryCheckResult {
  const { score, dataCompleteness } = sumCheckContributions(contributions);
  const flags: IrseFlag[] = [];
  const recommendations: string[] = [];
  for (const c of contributions) {
    if (c.flag) flags.push(c.flag);
    if (c.recommendation) recommendations.push(c.recommendation);
  }
  return { score, flags, recommendations, dataCompleteness };
}
