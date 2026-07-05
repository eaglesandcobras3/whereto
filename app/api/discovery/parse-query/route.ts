import { NextResponse } from "next/server";
import { discoverApiBlocked } from "@/lib/feature-flags";
import { parseDiscoverQueryAsync } from "@/lib/discovery-filters/parse-discover-query-async";

type Body = {
  query?: string;
};

export async function POST(request: Request) {
  const blocked = await discoverApiBlocked();
  if (blocked) return blocked;

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

  const parsed = await parseDiscoverQueryAsync(query);
  return NextResponse.json({
    query,
    parsed,
    telemetry: parsed.telemetry,
  });
}
