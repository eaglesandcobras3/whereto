import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export async function GET() {
  const admin = await requireAdminUser();
  return NextResponse.json({
    isAdmin: Boolean(admin),
    showAdminNav: Boolean(admin),
  });
}
