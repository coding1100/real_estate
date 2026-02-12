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

  const domain = await prisma.domain.update({
    where: { id },
    data: {
      hostname: body.hostname,
      displayName: body.displayName,
      notifyEmail: body.notifyEmail,
      notifySms: body.notifySms,
      isActive: body.isActive,
      ga4Id: body.ga4Id,
      metaPixelId: body.metaPixelId,
    },
  });

  return NextResponse.json({ domain }, { status: 200 });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  await prisma.domain.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

