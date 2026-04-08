import { z } from "zod";

import { getSupabasePublishableKey, getSupabaseSecretKey } from "./supabase/env-keys";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  GEOAPIFY_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  OPENAI_MODEL: z.string().optional().default("gpt-4o-mini"),
});

export type Env = z.infer<typeof schema>;

export function getServerEnv(): Env {
  const publishable = getSupabasePublishableKey();
  const secret = getSupabaseSecretKey();
  const parsed = schema.safeParse({
    ...process.env,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
    SUPABASE_SECRET_KEY: secret,
  });
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid env: ${JSON.stringify(msg)}`);
  }
  return parsed.data;
}

export function getOptionalEnv(): Partial<Env> & { OPENAI_MODEL: string } {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: getSupabasePublishableKey(),
    SUPABASE_SECRET_KEY: getSupabaseSecretKey(),
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEOAPIFY_API_KEY: process.env.GEOAPIFY_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  };
}
