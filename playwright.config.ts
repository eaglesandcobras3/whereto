import { defineConfig, devices } from "@playwright/test";

const isCi = !!process.env.CI;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_e2e_placeholder_not_real_00000000";
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "sb_secret_e2e_placeholder_not_real_00000000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: isCi ? 1 : undefined,
  reporter: "list",
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    // CI runs `npm run build` first — exercise the production server there.
    command: isCi
      ? "npm run start -- --hostname 127.0.0.1 --port 3000"
      : "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    timeout: 180_000,
    reuseExistingServer: !isCi,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
      SUPABASE_SECRET_KEY: supabaseSecretKey,
    },
  },
});
