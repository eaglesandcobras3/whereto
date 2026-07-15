import { expect, test } from "@playwright/test";
import {
  expectPrimaryHeading,
  gotoOk,
  hasLiveData,
  LIVE_SEED,
} from "./helpers";

/**
 * Entity / SEO detail pages need published Supabase rows. Skipped under placeholder
 * CI credentials unless `E2E_LIVE_DATA=1` (or a real NEXT_PUBLIC_SUPABASE_URL).
 */
test.describe("Detail pages (live data)", () => {
  test.beforeEach(() => {
    test.skip(!hasLiveData(), "Set E2E_LIVE_DATA=1 or a real Supabase URL for detail coverage");
  });

  test(`town /town/${LIVE_SEED.town}`, async ({ page }) => {
    const response = await gotoOk(page, `/town/${LIVE_SEED.town}`);
    expect(response!.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/town/${LIVE_SEED.town}`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test(`area /area/${LIVE_SEED.area}`, async ({ page }) => {
    const response = await gotoOk(page, `/area/${LIVE_SEED.area}`);
    expect(response!.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test(`business /business/${LIVE_SEED.business}`, async ({ page }) => {
    const response = await gotoOk(page, `/business/${LIVE_SEED.business}`);
    expect(response!.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test(`guide /guide/${LIVE_SEED.guide}`, async ({ page }) => {
    const response = await gotoOk(page, `/guide/${LIVE_SEED.guide}`);
    expect(response!.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test(`category hub /${LIVE_SEED.categoryHub}`, async ({ page }) => {
    const response = await gotoOk(page, `/${LIVE_SEED.categoryHub}`);
    expect(response!.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/${LIVE_SEED.categoryHub}`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test(`browse group /categories/${LIVE_SEED.categoryGroup}`, async ({ page }) => {
    const response = await gotoOk(page, `/categories/${LIVE_SEED.categoryGroup}`);
    expect(response!.status()).toBe(200);
    await expectPrimaryHeading(page, /Restaurants [&] bars on 30A/i);
  });

  test(`service group /services/${LIVE_SEED.serviceGroup}`, async ({ page }) => {
    const response = await gotoOk(page, `/services/${LIVE_SEED.serviceGroup}`);
    expect(response!.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
