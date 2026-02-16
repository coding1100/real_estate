import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id } = await ctx.params;

  // Basic validation for slug updates
  if (Object.prototype.hasOwnProperty.call(body, "slug")) {
    if (typeof body.slug !== "string" || body.slug.trim().length === 0) {
      return NextResponse.json(
        { error: "Slug cannot be empty." },
        { status: 400 },
      );
    }
    body.slug = body.slug.trim();
  }

  try {
    const page = await prisma.landingPage.update({
      where: { id },
      data: {
        ...body,
      },
    });

    return NextResponse.json({ page }, { status: 200 });
  } catch (err: any) {
    // Handle unique constraint violation on (domainId, slug)
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Slug already exists for this domain." },
        { status: 400 },
      );
    }

    console.error(err);
    return NextResponse.json(
      { error: "Failed to update page." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  await prisma.landingPage.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

