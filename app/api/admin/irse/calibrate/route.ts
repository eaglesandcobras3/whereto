import { NextResponse } from "next/server";
import { calibrateIrse, isPageKind, type PageKind } from "@/lib/irse";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    kinds?: string[];
    sampleSize?: number;
    forceInspect?: boolean;
    maxInspections?: number;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // empty body ok
  }

  const kinds = (body.kinds ?? [])
    .map((k) => k.trim())
    .filter((k): k is PageKind => isPageKind(k));

  const supabase = getServiceSupabase();
  const report = await calibrateIrse(supabase, {
    kinds: kinds.length ? kinds : undefined,
    sampleSize: typeof body.sampleSize === "number" ? body.sampleSize : undefined,
    forceInspect: body.forceInspect === true,
    maxInspections: typeof body.maxInspections === "number" ? body.maxInspections : undefined,
  });

  return NextResponse.json(report);
}
