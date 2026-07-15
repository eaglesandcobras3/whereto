import { expect, test } from "@playwright/test";
import {
  expectBrowseNav,
  expectPrimaryHeading,
  gotoOk,
  trackSupabaseBrowserApi,
} from "./helpers";

/**
 * Anonymous production-surface smoke: every public hub + static document must
 * render its primary heading (or an intentional empty-state) without 5xx, and
 * keep browse chrome intact. Content lists may be empty under placeholder Supabase.
 */
const PUBLIC_PAGES: Array<{ path: string; heading: string | RegExp }> = [
  { path: "/", heading: /Your local guide to 30A, Florida/i },
  { path: "/towns", heading: /Beach towns along 30A/i },
  { path: "/areas", heading: /Districts [&] town centers/i },
  { path: "/businesses", heading: /Local businesses on 30A/i },
  { path: "/categories", heading: /Browse by category/i },
  { path: "/services", heading: /Service providers on 30A/i },
  { path: "/guides", heading: /Travel guides/i },
  { path: "/about", heading: /About WhereTo30A/i },
  { path: "/privacy", heading: /Privacy Policy/i },
  { path: "/terms", heading: /Terms of Service/i },
  { path: "/feedback", heading: /Listing feedback/i },
  { path: "/list-your-business", heading: /List your business/i },
];

test.describe("Public pages (production shell)", () => {
  for (const { path, heading } of PUBLIC_PAGES) {
    test(`${path} loads with primary heading and browse nav`, async ({ page }) => {
      const supabaseHits = trackSupabaseBrowserApi(page);
      await gotoOk(page, path);
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}(\\?.*)?$`));
      await expectPrimaryHeading(page, heading);
      await expectBrowseNav(page);
      await page.waitForLoadState("networkidle");
      expect(supabaseHits, `${path} must not call browser Supabase auth/REST`).toEqual([]);
    });
  }

  test("home shows guide CTA and towns CTA when Ask is off", async ({ page }) => {
    await gotoOk(page, "/");
    await expect(page.getByRole("link", { name: /Browse travel guides/i })).toBeVisible();
    // Flags default off without PostHog: secondary CTA is towns, not Ask.
    const askCta = page.getByRole("link", { name: /Ask WhereTo30A/i });
    if (await askCta.isVisible().catch(() => false)) {
      await expect(askCta).toBeVisible();
    } else {
      await expect(page.getByRole("link", { name: /Browse towns/i })).toBeVisible();
    }
  });

  test("towns empty or populated state is usable", async ({ page }) => {
    await gotoOk(page, "/towns");
    const empty = page.getByText(/No towns are available right now/i);
    const cards = page.locator('a[href^="/town/"]');
    await expect(empty.or(cards.first())).toBeVisible();
  });

  test("areas empty or populated state is usable", async ({ page }) => {
    await gotoOk(page, "/areas");
    const empty = page.getByText(/No areas found/i);
    const cards = page.locator('a[href^="/area/"]');
    await expect(empty.or(cards.first())).toBeVisible();
  });

  test("nav Towns link reaches towns hub", async ({ page }) => {
    await gotoOk(page, "/");
    await page.getByRole("navigation").getByRole("link", { name: "Towns", exact: true }).click();
    await expect(page).toHaveURL(/\/towns(\?.*)?$/);
    await expectPrimaryHeading(page, /Beach towns along 30A/i);
  });
});
