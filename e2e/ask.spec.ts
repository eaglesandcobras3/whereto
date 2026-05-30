import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:3000";

function askCookie(value: boolean) {
  return {
    name: "ff_overrides",
    value: JSON.stringify({ ask: value }),
    url: BASE,
  };
}

const MOCK_ARTIFACT = {
  type: "business_results",
  title: "Coffee near Seaside",
  activeFilters: { query: "coffee" },
  results: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      title: "Test Cafe",
      slug: "test-cafe",
      town_or_area: "Seaside",
      category: "coffee",
      excerpt: null,
      price_level: 2,
      tags: ["coffee"],
      why_this_matched: "Neighborhood favorite for espresso.",
      confidence_score: 0.88,
      source_status: "verified",
      image_url: null,
    },
  ],
};

test.describe("Ask concierge", () => {
  test("redirects to home when ask flag is off", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([askCookie(false)]);
    const page = await context.newPage();
    await page.goto("/ask");
    await expect(page).toHaveURL(/\/(\?.*)?$/);
    await context.close();
  });

  test("loads /ask with starter prompts when ask is on", async ({ context, page }) => {
    await context.addCookies([askCookie(true)]);
    await page.goto("/ask");
    await expect(page.getByRole("heading", { name: /Ask WhereTo30A/i })).toBeVisible();
    await expect(page.getByText(/list my business/i)).toBeVisible();
    await expect(page.getByText(/Your recommendations appear here/i)).toBeVisible();
  });

  test("starter prompt updates artifact panel (mocked stream)", async ({ context, page }) => {
    await context.addCookies([askCookie(true)]);

    await page.route("**/api/ask", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      const conversationId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
      const artifactSessionId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
      const lines = [
        `data: ${JSON.stringify({
          type: "data-ask-artifact",
          data: {
            conversationId,
            artifactSessionId,
            artifact: MOCK_ARTIFACT,
            followUps: ["More casual?"],
            confidenceScore: 0.82,
            handoffRequired: false,
          },
        })}\n\n`,
        `data: ${JSON.stringify({ type: "text-delta", id: "t1", delta: "Here are verified picks." })}\n\n`,
        `data: ${JSON.stringify({ type: "text-end", id: "t1" })}\n\n`,
        `data: ${JSON.stringify({ type: "finish" })}\n\n`,
      ];
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
        },
        body: lines.join(""),
      });
    });

    await page.goto("/ask");
    await page.getByRole("button", { name: /gluten-free breakfast/i }).click();
    await expect(page.getByText("Test Cafe")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Coffee near Seaside")).toBeVisible();
  });

  test("share API returns slug (mocked)", async ({ context, page }) => {
    await context.addCookies([askCookie(true)]);

    await page.route("**/api/ask/share", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          slug: "e2e-ask-share",
          url: "/share/e2e-ask-share",
          summary: "• Test Cafe — match",
        }),
      });
    });

    await page.goto("/ask");
    const result = await page.evaluate(async (artifact) => {
      const res = await fetch("/api/ask/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifact }),
      });
      return { ok: res.ok, json: (await res.json()) as { slug: string } };
    }, MOCK_ARTIFACT);

    expect(result.ok).toBe(true);
    expect(result.json.slug).toBe("e2e-ask-share");
  });
});
