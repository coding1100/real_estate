import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, url, method = "POST", isActive = true } = body ?? {};

  if (!name || !url) {
    return NextResponse.json(
      { error: "name and url are required" },
      { status: 400 },
    );
  }

  const webhook = await prisma.webhookConfig.create({
    data: {
      name,
      url,
      method,
      isActive,
      headers: {},
    },
  });

  return NextResponse.json({ webhook }, { status: 201 });
}

