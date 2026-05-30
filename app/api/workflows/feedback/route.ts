import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { feedbackWorkflow } from "@/workflows/feedback";
import { verifyWorkflowSecret } from "@/lib/security/verifyWorkflowSecret";

export async function POST(request: Request) {
  if (!verifyWorkflowSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, string>;
  await start(feedbackWorkflow, [payload]);
  return NextResponse.json({ ok: true });
}
