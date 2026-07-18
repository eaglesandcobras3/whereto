import { NextResponse } from "next/server";
import { inspectUrl } from "@/lib/irse/gsc/client";
import { isGscConfigured } from "@/lib/irse/gsc/config";
import { absoluteUrlForPath } from "@/lib/irse/paths";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getSiteUrl } from "@/lib/site-url";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { path?: string; url?: string; force?: boolean };
  try {
    body = (await req.json()) as { path?: string; url?: string; force?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const path = body.path?.trim();
  const url =
    body.url?.trim() ||
    (path ? absoluteUrlForPath(path.startsWith("/") ? path : `/${path}`, getSiteUrl()) : "");

  if (!url) {
    return NextResponse.json({ error: "path or url is required." }, { status: 400 });
  }

  if (!isGscConfigured()) {
    return NextResponse.json(
      { error: "GSC is not configured. Set GSC_SITE_URL and service account env vars." },
      { status: 503 },
    );
  }

  const supabase = getServiceSupabase();
  const result = await inspectUrl(supabase, url, { force: body.force === true });

  if (result.error && result.indexed == null && !result.fromCache) {
    return NextResponse.json({ error: result.error, url }, { status: 502 });
  }

  return NextResponse.json({
    url,
    indexed: result.indexed,
    coverageState: result.coverageState,
    inspectedAt: result.inspectedAt,
    fromCache: result.fromCache,
    error: result.error,
  });
}
