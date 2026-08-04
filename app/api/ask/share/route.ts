import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  artifactSessionId: z.string().uuid(),
  title: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const blocked = await askApiBlocked();
  if (blocked) return blocked;

  if (!validateAskOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const supabase = getServiceSupabase();
  const { data: session, error: sessionError } = await supabase
    .from("ask_artifact_sessions")
    .select("id, conversation_id, artifact_json")
    .eq("id", parsed.data.artifactSessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Artifact session not found" }, { status: 404 });
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("ask_conversations")
    .select("user_id")
    .eq("id", session.conversation_id as string)
    .maybeSingle();

  if (conversationError || !conversation || conversation.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const artifact = session.artifact_json as AskArtifact;
  if (!artifact || typeof artifact !== "object" || !("type" in artifact)) {
    return NextResponse.json({ error: "Invalid artifact" }, { status: 400 });
  }

  const title = parsed.data.title ?? artifactShareTitle(artifact);
  const summary = generateArtifactSummary(artifact);
  const slug = generateShareSlug(title);

  const { error } = await supabase.from("artifact_shares").insert({
    slug,
    artifact_session_id: parsed.data.artifactSessionId,
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
