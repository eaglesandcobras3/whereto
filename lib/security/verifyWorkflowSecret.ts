export function verifyWorkflowSecret(request: Request): boolean {
  const expected = process.env.WORKFLOW_SECRET?.trim();
  if (!expected) {
    return process.env.NODE_ENV === "development";
  }
  const header = request.headers.get("x-workflow-secret")?.trim();
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const provided = header ?? bearer;
  if (!provided || provided.length !== expected.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return ok === 0;
}
