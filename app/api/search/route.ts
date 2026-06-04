import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSearchRateLimited, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { runSearch } from "@/lib/search/run-search";

export async function POST(request: NextRequest) {
  try {
    const ipKey = rateLimitKeyFromRequest(request);
    if (isSearchRateLimited(ipKey)) {
      return NextResponse.json(
        { error: "Too many searches. Try again shortly." },
        { status: 429 },
      );
    }

    const body = (await request.json()) as {
      query?: string;
      type?: string;
      specialty?: string | string[];
      service_category?: string | string[];
      category?: string | string[];
      town_id?: string;
      page?: number;
      pageSize?: number;
    };
    const q = typeof body.query === "string" ? body.query : "";
    if (!q.trim()) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const servicesOnly = body.type === "services";
    const specialtyRaw = body.specialty ?? body.service_category;
    const specialtySlugs = Array.isArray(specialtyRaw)
      ? specialtyRaw
      : typeof specialtyRaw === "string"
        ? specialtyRaw.split(",").filter(Boolean)
        : [];
    const categoryRaw = body.category;
    const categorySlugs = Array.isArray(categoryRaw)
      ? categoryRaw
      : typeof categoryRaw === "string"
        ? categoryRaw.split(",").filter(Boolean)
        : [];

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const sessionId = request.headers.get("x-session-id") ?? null;
    const result = await runSearch({
      rawQuery: q,
      userId: user?.id ?? null,
      model,
      openaiKey: process.env.OPENAI_API_KEY,
      sessionId,
      requiredIsServiceBusiness: servicesOnly ? true : undefined,
      constrainServiceCategorySlugs: servicesOnly && specialtySlugs.length ? specialtySlugs : undefined,
      constrainCategorySlugs:
        !servicesOnly && categorySlugs.length
          ? categorySlugs
          : servicesOnly
            ? categorySlugs.filter((s) => s !== "services")
            : undefined,
      constrainTownId: typeof body.town_id === "string" ? body.town_id : undefined,
      page: typeof body.page === "number" ? body.page : undefined,
      pageSize: typeof body.pageSize === "number" ? body.pageSize : undefined,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    const status =
      message.includes("Missing NEXT_PUBLIC_SUPABASE") ||
      message.includes("SUPABASE_SECRET_KEY") ||
      message.includes("SUPABASE_SERVICE_ROLE_KEY")
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
