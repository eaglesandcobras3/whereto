import { NextRequest, NextResponse } from "next/server";
import { communityTipsApiBlocked } from "@/lib/feature-flags";
import { profileAttributionCitySchema } from "@/lib/community-tips/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Read/update the signed-in user’s attribution city (semi-anonymous tip label). */
export async function GET() {
  const blocked = await communityTipsApiBlocked();
  if (blocked) return blocked;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("attribution_city")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    attribution_city: data?.attribution_city ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const blocked = await communityTipsApiBlocked();
  if (blocked) return blocked;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = profileAttributionCitySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid city name." }, { status: 400 });
  }

  const city = parsed.data.attribution_city;
  if (!city) {
    return NextResponse.json({ error: "City is required." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, attribution_city: city },
    { onConflict: "id" },
  );

  if (error) {
    console.error("profiles attribution_city", error);
    return NextResponse.json({ error: "Could not save city." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, attribution_city: city });
}
