/** SEO-bait intros that were stored in CMS `excerpt` fields but are not real page copy. */
const SEO_BOILERPLATE_PATTERNS = [
  /this (?:complete )?guide covers/i,
  /everything to know before (?:planning|visiting)/i,
  /detailed travel guide covers/i,
];

export function isSeoBoilerplateIntro(text: string | null | undefined): boolean {
  const trimmed = text?.trim();
  if (!trimmed) return false;
  return SEO_BOILERPLATE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

type ResolvePlaceIntroOptions = {
  excerpt?: string | null;
  seoDescription?: string | null;
  fallback: string;
};

/** Prefer editorial seo_description; ignore excerpt when it is thin SEO filler. */
export function resolvePlaceIntro({
  excerpt,
  seoDescription,
  fallback,
}: ResolvePlaceIntroOptions): string {
  for (const candidate of [seoDescription, excerpt]) {
    const trimmed = candidate?.trim();
    if (trimmed && !isSeoBoilerplateIntro(trimmed)) return trimmed;
  }
  return fallback;
}
