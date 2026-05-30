import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { askApiBlocked } from "@/lib/feature-flags";
import {
  artifactShareTitle,
  generateArtifactSummary,
  generateShareSlug,
} from "@/lib/ask/shareArtifacts";
import type { AskArtifact } from "@/lib/ask/types";
import { getSiteUrl } from "@/lib/site-url";
import { validateAskOrigin } from "@/lib/security/validateOrigin";

const bodySchema = z.object({
  artifactSessionId: z.string().uuid().optional(),
  artifact: z.custom<AskArtifact>(),
  title: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const blocked = await askApiBlocked();
  if (blocked) return blocked;

  if (!validateAskOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid artifact" }, { status: 400 });
  }

  const artifact = parsed.data.artifact;
  const title = parsed.data.title ?? artifactShareTitle(artifact);
  const summary = generateArtifactSummary(artifact);
  const slug = generateShareSlug(title);

  const supabase = getServiceSupabase();
  const { error } = await supabase.from("artifact_shares").insert({
    slug,
    artifact_session_id: parsed.data.artifactSessionId ?? null,
    title,
    summary_text: summary,
    artifact_snapshot: artifact,
  });

  if (error) {
    return NextResponse.json({ error: "Could not create share" }, { status: 500 });
  }

  const base = getSiteUrl().replace(/\/$/, "");
  return NextResponse.json({
    slug,
    url: `${base}/share/${slug}`,
    summary,
  });
}
