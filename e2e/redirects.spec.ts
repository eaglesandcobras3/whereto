import { expect, test } from "@playwright/test";
import { gotoOk } from "./helpers";

/**
 * Redirect contracts that protect production URLs. Defaults assume PostHog flags
 * are off (code defaults) unless a project override enables them.
 */
test.describe("Redirect contracts", () => {
  test("/search with no filters redirects to home", async ({ page }) => {
    await page.goto("/search");
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });

  test("/search?type=towns redirects to /towns", async ({ page }) => {
    await page.goto("/search?type=towns");
    await expect(page).toHaveURL(/\/towns(\?.*)?$/);
  });

  test("/search?type=areas redirects to /areas", async ({ page }) => {
    await page.goto("/search?type=areas");
    await expect(page).toHaveURL(/\/areas(\?.*)?$/);
  });

  test("/search?type=businesses redirects to /businesses", async ({ page }) => {
    await page.goto("/search?type=businesses");
    await expect(page).toHaveURL(/\/businesses(\?.*)?$/);
  });

  test("/search?type=guides redirects to /guides", async ({ page }) => {
    await page.goto("/search?type=guides");
    await expect(page).toHaveURL(/\/guides(\?.*)?$/);
  });

  test("/search?type=services redirects to /services", async ({ page }) => {
    await page.goto("/search?type=services");
    await expect(page).toHaveURL(/\/services(\?.*)?$/);
  });

  test("legacy restaurants-on-30a redirects to /restaurants", async ({ page }) => {
    const response = await page.goto("/restaurants-on-30a", { waitUntil: "domcontentloaded" });
    expect(response).toBeTruthy();
    expect(response!.status()).toBeLessThan(500);
    // Middleware 308 → /restaurants; without published category rows the catch-all
    // may then soft-redirect to /towns. Either landed URL must stay production-safe.
    await expect(page).toHaveURL(/\/(restaurants|towns)(\?.*)?$/);
  });

  test("/guide redirects toward first-timer guide path", async ({ page }) => {
    await page.goto("/guide");
    await expect(page).toHaveURL(/\/guide\/ultimate-30a-first-timers-guide(\?.*)?$/);
  });

  test("/discover redirects home when discover flag is off", async ({ page }) => {
    await page.goto("/discover");
    if (new URL(page.url()).pathname === "/discover") {
      test.skip(true, "PostHog `discover` is enabled — disable it to assert the off-path");
    }
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });

  test("/ask redirects home when ask flag is off", async ({ page }) => {
    await page.goto("/ask");
    if (new URL(page.url()).pathname === "/ask") {
      test.skip(true, "PostHog `ask` is enabled — disable it to assert the off-path");
    }
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });

  test("/portal redirects home when onboard flag is off", async ({ page }) => {
    await page.goto("/portal");
    if (new URL(page.url()).pathname.startsWith("/portal")) {
      test.skip(true, "PostHog `onboard` is enabled — disable it to assert the off-path");
    }
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });

  test("/admin/search-debug redirects home when search_inspector is off", async ({
    page,
  }) => {
    await page.goto("/admin/search-debug");
    if (new URL(page.url()).pathname.startsWith("/admin/search-debug")) {
      test.skip(true, "PostHog `search_inspector` is enabled");
    }
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });

  test("list-your-business stays public when onboard is off", async ({ page }) => {
    await gotoOk(page, "/list-your-business");
    if (new URL(page.url()).pathname.startsWith("/portal")) {
      test.skip(true, "PostHog `onboard` is enabled — list page redirects into portal");
    }
    await expect(page).toHaveURL(/\/list-your-business(\?.*)?$/);
  });
});
