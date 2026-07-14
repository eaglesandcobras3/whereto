import { expect, test } from "@playwright/test";
import { gotoOk } from "./helpers";

test.describe("Auth-gated and account surfaces", () => {
  test("/profile redirects anonymous users to login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/saved shows sign-in prompt for anonymous users", async ({ page }) => {
    await gotoOk(page, "/saved");
    await expect(page.getByText(/Sign in to see saved places/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign in/i }).first()).toBeVisible();
  });

  test("/admin without session does not expose admin chrome", async ({ page }) => {
    await page.goto("/admin");
    // requireAdminUser sends non-admins home (not login).
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });
});
