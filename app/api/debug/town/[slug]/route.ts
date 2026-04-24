import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getTownBySlug } from "@/lib/data/town-hub";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/town/rosemary-beach
 * Same data as the verify page, but a Route Handler so it is not subject to
 * optional catch-all / page 404 issues in the App Router.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: raw } = await params;
  const slug = normalizeUrlSegment(raw);
  if (!slug) {
    return NextResponse.json({ error: "empty slug" }, { status: 400 });
  }

  let payload: Record<string, unknown>;

  try {
    const supabase = getServiceSupabase();
    const [q0, q1, townVia] = await Promise.all([
      supabase
        .from("towns")
        .select("id, title, slug, archived_at, is_hidden_from_search")
        .eq("slug", slug)
        .limit(1),
      supabase
        .from("towns")
        .select("id, title, slug, archived_at, is_hidden_from_search")
        .eq("slug", slug)
        .is("archived_at", null)
        .limit(1),
      getTownBySlug(slug),
    ]);

    payload = {
      nodeEnv: process.env.NODE_ENV,
      slug,
      bySlugNoOtherFilters: { error: q0.error, data: q0.data },
      bySlugAndNotArchived: { error: q1.error, data: q1.data },
      getTownBySlug: townVia,
    };
  } catch (e) {
    payload = {
      nodeEnv: process.env.NODE_ENV,
      slug,
      fatal: e instanceof Error ? e.message : String(e),
      hint: "Missing SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY in .env.local at the project root (same folder as package.json).",
    };
  }

  return NextResponse.json(payload);
}
