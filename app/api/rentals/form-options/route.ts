import { NextResponse } from "next/server";
import { listTownPickerOptions } from "@/lib/admin/guides";
import { rentalsApiBlocked } from "@/lib/feature-flags";
import { getServiceSupabase } from "@/lib/supabase/service-role";

/** Public (flag-gated) picker options for the list-a-rental form. */
export async function GET() {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;

  const supabase = getServiceSupabase();
  const towns = await listTownPickerOptions(supabase);
  return NextResponse.json({ towns });
}
