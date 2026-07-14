import { expect, test } from "@playwright/test";
import { gotoOk, trackSupabaseBrowserApi } from "./helpers";

/** Public browse surfaces must not mount a browser Supabase auth/REST client. */
const PUBLIC_BROWSE_PATHS = [
  "/",
  "/towns",
  "/areas",
  "/businesses",
  "/categories",
  "/services",
  "/guides",
  "/about",
  "/login",
] as const;

test.describe("No browser Supabase client", () => {
  for (const path of PUBLIC_BROWSE_PATHS) {
    test(`${path} does not call Supabase auth or REST APIs on load`, async ({ page }) => {
      const supabaseApiRequests = trackSupabaseBrowserApi(page);
      await gotoOk(page, path);
      await page.waitForLoadState("networkidle");
      expect(supabaseApiRequests).toEqual([]);
    });
  }
});
