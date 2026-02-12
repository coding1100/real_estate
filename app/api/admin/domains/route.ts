import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    hostname,
    displayName,
    notifyEmail,
    notifySms,
    isActive = true,
    ga4Id,
    metaPixelId,
  } = body ?? {};

  if (!hostname || !displayName || !notifyEmail) {
    return NextResponse.json(
      { error: "hostname, displayName, notifyEmail are required" },
      { status: 400 },
    );
  }

  const domain = await prisma.domain.create({
    data: {
      hostname,
      displayName,
      notifyEmail,
      notifySms,
      isActive,
      ga4Id,
      metaPixelId,
    },
  });

  return NextResponse.json({ domain }, { status: 201 });
}

