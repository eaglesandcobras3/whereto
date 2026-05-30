import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { businessSubmissionWorkflow } from "@/workflows/business-submission";
import { verifyWorkflowSecret } from "@/lib/security/verifyWorkflowSecret";

export async function POST(request: Request) {
  if (!verifyWorkflowSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, string>;
  await start(businessSubmissionWorkflow, [payload]);
  return NextResponse.json({ ok: true });
}
