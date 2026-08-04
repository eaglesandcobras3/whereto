import { NextRequest, NextResponse } from "next/server";
import {
  discoverApiBlocked,
  getAllFeatureFlags,
  isDiscoverNlFeatureEnabled,
} from "@/lib/feature-flags";
import {
  parseDiscoverQueryAsync,
  type DiscoverNlParseTelemetry,
} from "@/lib/discovery-filters/parse-discover-query-async";
import { parseDiscoverQuery } from "@/lib/discovery-filters/parse-discover-query";
import { describeDiscoverParseDoubt } from "@/lib/discovery-filters/parse-discover-query-merge";
import { isSearchRateLimited, rateLimitKeyFromRequest } from "@/lib/security/rateLimit";

type Body = {
  query?: string;
};

export async function POST(request: NextRequest) {
  const blocked = await discoverApiBlocked();
  if (blocked) return blocked;

  const ipKey = rateLimitKeyFromRequest(request);
  if (isSearchRateLimited(`discover-parse:${ipKey}`)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const flags = await getAllFeatureFlags();
  if (!isDiscoverNlFeatureEnabled(flags)) {
    const parsed = { ...parseDiscoverQuery(query), resolver: "deterministic" as const };
    const doubt = describeDiscoverParseDoubt(parsed);
    const telemetry: DiscoverNlParseTelemetry = {
      resolver: "deterministic",
      used_llm: false,
      llm_attempted: false,
      llm_succeeded: false,
      deterministic_confidence: doubt.confidence,
      doubt_reasons: doubt.doubtReasons,
      confused_terms: parsed.unresolvedTerms ?? [],
      matched_rule_id: parsed.deterministicSignals?.matchedRuleId,
      from_cache: false,
    };
    return NextResponse.json({
      query,
      parsed,
      telemetry,
    });
  }

  const parsed = await parseDiscoverQueryAsync(query);
  return NextResponse.json({
    query,
    parsed,
    telemetry: parsed.telemetry,
  });
}
