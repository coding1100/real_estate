import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { domainId?: unknown; pageIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const domainId =
    typeof body.domainId === "string" ? body.domainId.trim() : "";
  const pageIds = body.pageIds;
  if (!domainId) {
    return NextResponse.json(
      { error: "domainId is required." },
      { status: 400 },
    );
  }
  if (!Array.isArray(pageIds) || pageIds.length === 0) {
    return NextResponse.json(
      { error: "pageIds must be a non-empty array." },
      { status: 400 },
    );
  }

  const normalizedIds = pageIds.map((id) => String(id));
  if (normalizedIds.some((id) => !id)) {
    return NextResponse.json(
      { error: "Each page id must be a non-empty string." },
      { status: 400 },
    );
  }
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    return NextResponse.json(
      { error: "Duplicate page ids are not allowed." },
      { status: 400 },
    );
  }

  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { id: true },
  });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  }

  const pagesInDomain = await prisma.landingPage.findMany({
    where: { domainId, id: { in: normalizedIds } },
    select: { id: true, adminListOrder: true },
  });
  if (pagesInDomain.length !== normalizedIds.length) {
    return NextResponse.json(
      { error: "One or more page ids do not belong to this domain." },
      { status: 400 },
    );
  }
  // Reorder only the provided subset. This keeps drag-and-drop resilient when
  // the client view omits pages (e.g. filtered/archived views).
  const minExistingOrder = pagesInDomain.reduce(
    (min, page) => Math.min(min, page.adminListOrder ?? 0),
    Number.POSITIVE_INFINITY,
  );
  const baseOrder = Number.isFinite(minExistingOrder) ? minExistingOrder : 0;

  try {
    // Raw UPDATE so drag-and-drop persists even if Prisma Client was generated
    // before `adminListOrder` existed (same resilience as admin list SQL reads).
    await prisma.$transaction(
      normalizedIds.map((id, index) =>
        prisma.$executeRaw`
          UPDATE "LandingPage"
          SET "adminListOrder" = ${baseOrder + index}, "updatedAt" = NOW()
          WHERE "id" = ${id}
        `,
      ),
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[pages/reorder]", err);
    return NextResponse.json(
      { error: "Failed to save page order." },
      { status: 500 },
    );
  }
}
