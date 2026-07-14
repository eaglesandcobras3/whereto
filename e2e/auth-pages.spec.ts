import { expect, test } from "@playwright/test";
import { expectPrimaryHeading, gotoOk, trackSupabaseBrowserApi } from "./helpers";

test.describe("Auth pages (anonymous shells)", () => {
  test("/login renders sign-in form without browser Supabase calls on load", async ({
    page,
  }) => {
    const supabaseHits = trackSupabaseBrowserApi(page);
    await gotoOk(page, "/login");
    await expectPrimaryHeading(page, /Sign in/i);
    await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Forgot/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(supabaseHits).toEqual([]);
  });

  test("/signup renders create-account shell", async ({ page }) => {
    await gotoOk(page, "/signup");
    await expectPrimaryHeading(page, /Create account/i);
  });

  test("/forgot-password renders reset shell", async ({ page }) => {
    await gotoOk(page, "/forgot-password");
    await expectPrimaryHeading(page, /Reset password/i);
    await expect(page.getByLabel(/email/i).or(page.locator('input[type="email"]'))).toBeVisible();
  });

  test("/reset-password renders set-password shell", async ({ page }) => {
    await gotoOk(page, "/reset-password");
    await expectPrimaryHeading(page, /Set new password/i);
  });

  test("login links to signup", async ({ page }) => {
    await gotoOk(page, "/login");
    const signup = page.getByRole("link", { name: /Sign up|Create account|Create an account/i });
    await expect(signup.first()).toBeVisible();
    await signup.first().click();
    await expect(page).toHaveURL(/\/signup/);
  });
});
