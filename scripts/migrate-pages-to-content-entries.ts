import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function toContentType(pageType: string): string {
  if (["guide", "town", "business", "area", "event", "seasonal"].includes(pageType)) {
    return pageType;
  }
  return "page";
}

async function main() {
  console.log("Migrating pages -> content_entries");

  const { data: pages, error } = await supabase
    .from("pages")
    .select("slug, page_type, title, body_markdown, seo_title, seo_description, seo_keywords, og_image_url, status");

  if (error) {
    console.error("Failed to load pages:", error.message);
    process.exit(1);
  }

  let inserted = 0;
  for (const page of pages ?? []) {
    const contentType = toContentType(String(page.page_type ?? "page"));
    const status =
      page.status === "published" || page.status === "archived" ? page.status : "draft";

    const { error: upsertErr } = await supabase.from("content_entries").upsert(
      {
        content_type: contentType,
        slug: page.slug,
        title: page.title ?? page.slug,
        body_markdown: page.body_markdown ?? null,
        seo_title: page.seo_title ?? null,
        seo_description: page.seo_description ?? null,
        seo_keywords: (page.seo_keywords as string[] | null) ?? null,
        og_image_url: page.og_image_url ?? null,
        legacy_page_slug: page.slug,
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
      },
      { onConflict: "content_type,slug" },
    );
    if (upsertErr) {
      console.error(`Failed to upsert ${contentType}/${page.slug}: ${upsertErr.message}`);
      continue;
    }
    inserted += 1;
  }

  console.log(`Done. Upserted ${inserted} content entries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

