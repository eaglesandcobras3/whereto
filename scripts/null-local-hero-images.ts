import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!key) throw new Error("Missing service key: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const targets: Array<{
    table: string;
    column: string;
    filter: Record<string, string>;
  }> = [
    { table: "businesses", column: "hero_image_url", filter: { hero_image_url: "/images/" } },
    { table: "events", column: "hero_image_url", filter: { hero_image_url: "/images/" } },
    { table: "pages", column: "og_image_url", filter: { og_image_url: "/images/" } },
  ];

  for (const t of targets) {
    const col = t.column as "hero_image_url" | "og_image_url";
    const { data, error } = await supabase
      .from(t.table)
      .update({ [col]: null })
      .like(col, `${t.filter[col]}%`);
    if (error) throw error;
    // supabase-js doesn't return affected row count reliably for PostgREST updates unless asked.
    // This script is intended as a one-time cleanup; success is the primary signal.
    void data;
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

