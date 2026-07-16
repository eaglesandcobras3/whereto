import { expect, type Page, type Response } from "@playwright/test";

/** Placeholder Supabase host used in CI / local Playwright webServer defaults. */
export function isPlaceholderSupabaseUrl(url: string | undefined): boolean {
  if (!url?.trim()) return true;
  return /example\.supabase\.co/i.test(url);
}

/** True when Playwright is aimed at a deployed site (Vercel preview/prod). */
export function isRemoteTarget(): boolean {
  return Boolean(
    process.env.PLAYWRIGHT_BASE_URL?.trim() || process.env.BASE_URL?.trim(),
  );
}

/**
 * True when the suite can expect seeded entity pages (town/business/guide detail).
 * Remote Vercel targets always count as live; otherwise set `E2E_LIVE_DATA=1`
 * or a real `NEXT_PUBLIC_SUPABASE_URL`.
 */
export function hasLiveData(): boolean {
  if (process.env.E2E_LIVE_DATA === "1") return true;
  if (isRemoteTarget()) return true;
  return !isPlaceholderSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export const BROWSE_NAV_LABELS = ["Towns", "Areas", "Businesses", "Services", "Guides"] as const;

/** Default seed slugs used when live Supabase data is available. */
export const LIVE_SEED = {
  town: process.env.E2E_TOWN_SLUG?.trim() || "seaside",
  area: process.env.E2E_AREA_SLUG?.trim() || "seaside-town-center",
  business: process.env.E2E_BUSINESS_SLUG?.trim() || "amavida-coffee-rosemary-beach",
  guide: process.env.E2E_GUIDE_SLUG?.trim() || "ultimate-30a-first-timers-guide",
  categoryGroup: "restaurants-and-bars",
  serviceGroup: "home-trades",
  categoryHub: "restaurants",
} as const;

export async function gotoOk(page: Page, path: string): Promise<Response | null> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `expected a response for ${path}`).toBeTruthy();
  expect(response!.status(), `${path} should not 5xx`).toBeLessThan(500);
  return response;
}

export async function expectPrimaryHeading(page: Page, name: string | RegExp) {
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

export async function expectBrowseNav(page: Page) {
  const nav = page.getByRole("navigation").first();
  await expect(nav).toBeVisible();
  for (const label of BROWSE_NAV_LABELS) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("img", { name: "WhereTo30A" }).first()).toBeVisible();
}

export function trackSupabaseBrowserApi(page: Page): string[] {
  const hits: string[] = [];
  page.on("request", (request) => {
    if (/supabase\.co\/(auth|rest)\/v1\//.test(request.url())) {
      hits.push(request.url());
    }
  });
  return hits;
}
