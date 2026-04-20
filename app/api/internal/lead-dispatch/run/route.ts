import { NextRequest, NextResponse } from "next/server";
import {
  countPendingLeadDispatchJobs,
  processLeadDispatchQueue,
} from "@/lib/leadDispatchQueue";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const expected = (process.env.LEAD_DISPATCH_SECRET ?? "").trim();
  if (!expected) return false;

  const headerSecret = request.headers.get("x-lead-dispatch-secret")?.trim();
  if (headerSecret && headerSecret === expected) return true;

  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token && token === expected) return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    maxJobs?: number;
    workerId?: string;
  };
  const maxJobs = Math.min(100, Math.max(1, Math.floor(body.maxJobs ?? 20)));
  const workerId =
    typeof body.workerId === "string" && body.workerId.trim()
      ? body.workerId.trim()
      : `api-internal-${Date.now()}`;

  const result = await processLeadDispatchQueue({ maxJobs, workerId });
  const pending = await countPendingLeadDispatchJobs();

  return NextResponse.json({
    ok: true,
    ...result,
    pending,
  });
}
