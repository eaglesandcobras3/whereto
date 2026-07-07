/**
 * Step-by-step Supabase checks (same as /dev/supabase-check). From repo root:
 *
 *   pnpm run diagnose:supabase
 *   pnpm run diagnose:supabase -- rosemary-beach
 *   pnpm run diagnose:supabase -- rosemary-beach amavida-rosemary-beach
 *
 * Use one `--` only (the pnpm separator before args). Extra `--` tokens are ignored.
 * Town slug first, business slug second — rosemary-beach is a town, not a business.
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  buildSupabaseEnvStep,
  getSupabaseSecretKeyForDiagnostics,
  normalizeOptionalSlug,
  runSupabaseDataSteps,
} from "../lib/diagnostics/supabase-steps";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function printStep(s: { n: number; title: string; ok: boolean; detail: string }) {
  const label = s.ok ? "OK" : "FAIL";
   
  console.log(`\n--- Step ${s.n}: ${s.title} [${label}] ---\n${s.detail}`);
}

async function main() {
  const userArgs = process.argv.slice(2).filter((a) => a !== "--");
  const townArg = normalizeOptionalSlug(userArgs[0]);
  const bizArg = normalizeOptionalSlug(userArgs[1]);

  const step1 = buildSupabaseEnvStep();
  printStep(step1);
  if (!step1.ok) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return;
  const key = getSupabaseSecretKeyForDiagnostics();
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const dataSteps = await runSupabaseDataSteps(supabase, { townSlug: townArg, businessSlug: bizArg });
  for (const s of dataSteps) {
    printStep(s);
  }

   
  console.log(
    "\n--- UI ---\n" + "http://localhost:3000/dev/supabase-check\n" + (townArg || bizArg ? `?town=${townArg ?? ""}&business=${bizArg ?? ""}\n` : ""),
  );
}

main().catch((e) => {
   
  console.error(e);
  process.exit(1);
});
