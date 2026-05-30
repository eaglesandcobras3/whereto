import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { humanReviewWorkflow } from "@/workflows/human-review";
import { verifyWorkflowSecret } from "@/lib/security/verifyWorkflowSecret";

export async function POST(request: Request) {
  if (!verifyWorkflowSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, string>;
  await start(humanReviewWorkflow, [payload]);
  return NextResponse.json({ ok: true });
}
