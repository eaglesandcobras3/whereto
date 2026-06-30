/** Static homepage hero asset in `public/hero.webp`. */
export const HOME_HERO_IMAGE_PATH = "/hero.webp";

/** Legacy design-mock placeholder URLs that should not override the local hero. */
export function isLegacyHomeHeroPlaceholder(url: string): boolean {
  return url.includes("googleusercontent.com/aida-public/");
}

export function resolveHomeHeroImageUrl(envValue?: string | null): string {
  const fromEnv = envValue?.trim();
  if (!fromEnv || isLegacyHomeHeroPlaceholder(fromEnv)) {
    return HOME_HERO_IMAGE_PATH;
  }
  return fromEnv;
}
