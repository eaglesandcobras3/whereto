import { test, expect } from "@playwright/test";

test.describe("Search (mocked API)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          query: "coffee",
          query_hash: "h1",
          normalized_query: "coffee",
          summary: "Found great picks for you.",
          recommendations: [
            {
              business_id: "11111111-1111-1111-1111-111111111111",
              rank: 1,
              headline: "Strong local pick",
              explanation: "Neighborhood favorite for espresso.",
              highlighted_tags: ["coffee"],
              business: {
                name: "Test Cafe",
                lat: 30.32,
                lng: -86.13,
                google_rating: 4.5,
              },
            },
          ],
          cached: false,
          cache_id: "22222222-2222-2222-2222-222222222222",
        }),
      });
    });
    await page.route("**/api/impressions", (route) =>
      route.fulfill({ status: 200, body: "{}" }),
    );
  });

  test("happy path: submit search and see results", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/kid friendly/).fill("coffee");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("Found great picks for you.")).toBeVisible();
    await expect(page.getByText("Test Cafe")).toBeVisible();
    await expect(page.getByText("Strong local pick")).toBeVisible();
  });
});
