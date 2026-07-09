import { expect, test } from "@playwright/test";

function isSupabaseAuthOrRestRequest(url: string): boolean {
  return /supabase\.co\/(auth|rest)\/v1\//.test(url);
}

test.describe("No browser Supabase client", () => {
  test("home page does not call Supabase auth or REST APIs", async ({ page }) => {
    const supabaseApiRequests: string[] = [];
    page.on("request", (request) => {
      if (isSupabaseAuthOrRestRequest(request.url())) {
        supabaseApiRequests.push(request.url());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(supabaseApiRequests).toEqual([]);
  });

  test("login page does not call Supabase auth or REST APIs on load", async ({ page }) => {
    const supabaseApiRequests: string[] = [];
    page.on("request", (request) => {
      if (isSupabaseAuthOrRestRequest(request.url())) {
        supabaseApiRequests.push(request.url());
      }
    });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    expect(supabaseApiRequests).toEqual([]);
  });
});
