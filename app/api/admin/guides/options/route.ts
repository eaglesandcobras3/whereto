import { NextResponse } from "next/server";
import {
  listAreaPickerOptions,
  listGuideTagVocabulary,
  listTownPickerOptions,
  searchBusinessPickerOptions,
} from "@/lib/admin/guides";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const townId = url.searchParams.get("townId");
  const businessQuery = url.searchParams.get("businessQuery") ?? "";

  const supabase = getServiceSupabase();
  const [towns, areas, businesses, tagVocabulary] = await Promise.all([
    listTownPickerOptions(supabase),
    listAreaPickerOptions(supabase, townId),
    businessQuery.trim()
      ? searchBusinessPickerOptions(supabase, businessQuery)
      : Promise.resolve([]),
    listGuideTagVocabulary(supabase),
  ]);

  return NextResponse.json({ towns, areas, businesses, tagVocabulary });
}
