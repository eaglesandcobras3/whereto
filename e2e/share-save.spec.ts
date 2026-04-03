import { test, expect } from "@playwright/test";

test.describe("Share and save (mocked API)", () => {
  test("save redirects to login when unauthenticated", async ({ page }) => {
    await page.route("**/api/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          query: "x",
          query_hash: "h",
          normalized_query: "x",
          summary: "Ok",
          recommendations: [
            {
              business_id: "33333333-3333-3333-3333-333333333333",
              rank: 1,
              headline: "Pick",
              explanation: "Desc",
              highlighted_tags: [],
              business: { name: "Save Me", lat: 30, lng: -86 },
            },
          ],
          cached: false,
        }),
      });
    });
    await page.route("**/api/impressions", (r) =>
      r.fulfill({ status: 200, body: "{}" }),
    );
    await page.route("**/api/saves", (r) => r.fulfill({ status: 401, body: "{}" }));

    await page.goto("/");
    await page.getByPlaceholder(/kid friendly/).fill("places");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("Save Me")).toBeVisible();
    const loginNav = page.waitForURL(/\/login/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Save" }).first().click();
    await loginNav;
  });

  test("share link flow and recipient page", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://127.0.0.1:3000",
    });

    await page.route("**/api/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          query: "beach eats",
          query_hash: "h2",
          normalized_query: "beach eats",
          summary: "Beach picks",
          recommendations: [
            {
              business_id: "44444444-4444-4444-4444-444444444444",
              rank: 1,
              headline: "Top",
              explanation: "On the sand.",
              highlighted_tags: [],
              business: { name: "Shack", lat: 30.3, lng: -86.1 },
            },
          ],
          cached: false,
          cache_id: "55555555-5555-5555-5555-555555555555",
        }),
      });
    });
    await page.route("**/api/impressions", (r) =>
      r.fulfill({ status: 200, body: "{}" }),
    );
    await page.route("**/api/interactions", (r) =>
      r.fulfill({ status: 200, body: "{}" }),
    );
    await page.route("**/api/shares", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/share/e2e-share-id" }),
      });
    });

    await page.goto("/");
    await page.getByPlaceholder(/kid friendly/).fill("beach");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("Copy share link")).toBeVisible();
    await page.getByRole("button", { name: "Copy share link" }).click();
    await expect(page.getByText(/Link copied/)).toBeVisible();

    await page.route("**/api/share/e2e-share-id", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          query: "beach eats",
          summary: "Beach picks",
          recommendations: [
            {
              business_id: "44444444-4444-4444-4444-444444444444",
              headline: "Top",
              explanation: "On the sand.",
              business: { name: "Shack", google_rating: 4.2 },
            },
          ],
        }),
      });
    });

    await page.goto("/share/e2e-share-id");
    await expect(page.getByRole("heading", { name: "Beach picks" })).toBeVisible();
    await expect(page.getByText("Shack")).toBeVisible();
  });
});
