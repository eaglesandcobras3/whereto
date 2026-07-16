import { getSiteInstagramUrl, getSiteTikTokUrl } from "@/lib/site-social";
import { getSiteUrl } from "@/lib/site-url";

/** Brand chrome shared across transactional MJML templates. */
/** Matches site sticky nav (`--color-site-chrome`). */
export const EMAIL_HEADER = "#f2f5f5";
/** Teal footer / accents from marketing emails. */
export const EMAIL_TEAL = "#5DA6A8";
export const EMAIL_TEAL_BUTTON = "#57A0AF";
export const EMAIL_TEXT = "#1c3257";
export const EMAIL_MUTED = "#5a6b6d";
export const EMAIL_BG = "#f7fafb";

export function emailSiteBase(): string {
  return getSiteUrl().replace(/\/$/, "");
}

/** Absolute URL for a file under /public (required for email clients). */
export function emailAssetUrl(publicPath: string): string {
  const path = publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
  return `${emailSiteBase()}${path}`;
}

export function emailBrandAssetVars(): Record<string, string> {
  const base = emailSiteBase();
  const instagram = getSiteInstagramUrl() || "https://www.instagram.com/whereto30a/";
  const tiktok = getSiteTikTokUrl() || "https://www.tiktok.com/@whereto30a";

  return {
    siteUrl: base,
    logoUrl: emailAssetUrl("/email/logo-header-dark.png"),
    waveUrl: emailAssetUrl("/email/wave-accent.png"),
    bannerUrl: emailAssetUrl("/email/beach-towns-banner.jpg"),
    iconInstagramUrl: emailAssetUrl("/email/icons/instagram.png"),
    iconTiktokUrl: emailAssetUrl("/email/icons/tiktok.png"),
    iconWebsiteUrl: emailAssetUrl("/email/icons/website.png"),
    instagramUrl: instagram,
    tiktokUrl: tiktok,
    brandHeader: EMAIL_HEADER,
    brandTeal: EMAIL_TEAL,
    brandButton: EMAIL_TEAL_BUTTON,
  };
}
