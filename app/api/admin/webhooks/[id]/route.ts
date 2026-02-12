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

  const webhook = await prisma.webhookConfig.update({
    where: { id },
    data: {
      name: body.name,
      url: body.url,
      method: body.method ?? "POST",
      isActive: body.isActive,
    },
  });

  return NextResponse.json({ webhook }, { status: 200 });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  await prisma.webhookConfig.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

