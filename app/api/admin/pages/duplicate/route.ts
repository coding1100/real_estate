import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let pageId: string | null = null;

  if (contentType.includes("application/json")) {
    const body = await req.json();
    pageId = body?.pageId ? String(body.pageId) : null;
  } else {
    const formData = await req.formData();
    const raw = formData.get("pageId");
    pageId = raw != null ? String(raw) : null;
  }

  if (!pageId) {
    return NextResponse.json(
      { error: "Missing pageId" },
      { status: 400 },
    );
  }

  const original = await prisma.landingPage.findUnique({
    where: { id: pageId },
  });
  if (!original) {
    return NextResponse.json(
      { error: "Page not found" },
      { status: 404 },
    );
  }

  const copy = await prisma.landingPage.create({
    data: {
      ...original,
      id: undefined as any,
      slug: `${original.slug}-copy`,
      status: "draft",
      createdAt: undefined as any,
      updatedAt: undefined as any,
    },
  } as any);

  return NextResponse.json({ page: copy }, { status: 201 });
}

