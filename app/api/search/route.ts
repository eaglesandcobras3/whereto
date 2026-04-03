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

    const body = (await request.json()) as { query?: string };
    const q = typeof body.query === "string" ? body.query : "";
    if (!q.trim()) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const result = await runSearch({
      rawQuery: q,
      userId: user?.id ?? null,
      model,
      openaiKey: process.env.OPENAI_API_KEY,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    const status =
      message.includes("Missing NEXT_PUBLIC_SUPABASE") ||
      message.includes("SUPABASE_SERVICE_ROLE_KEY")
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
