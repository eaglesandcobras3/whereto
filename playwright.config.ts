import { defineConfig, devices } from "@playwright/test";

const isCi = !!process.env.CI;

/**
 * Remote target (Vercel preview / production). When set, Playwright does not
 * start a local Next server and needs no Supabase secrets in CI.
 */
const remoteBaseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() ||
  process.env.BASE_URL?.trim() ||
  "";

const baseURL = remoteBaseURL || "http://127.0.0.1:3000";
const useRemoteTarget = Boolean(remoteBaseURL);

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

const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

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
    baseURL,
    trace: "on-first-retry",
    ...(vercelBypass
      ? {
          extraHTTPHeaders: {
            "x-vercel-protection-bypass": vercelBypass,
          },
        }
      : {}),
  },
  // Local/dev only. Against Vercel, the deployment is already built with real env.
  ...(useRemoteTarget
    ? {}
    : {
        webServer: {
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
      }),
});
