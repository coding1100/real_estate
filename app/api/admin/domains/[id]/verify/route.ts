import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import {
  getDomainConnectionStatus,
  verifyProjectDomain,
  VercelDomainsError,
} from "@/lib/vercel-domains";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  try {
    const verifyResult = await verifyProjectDomain(domain.hostname);
    const vercel = await getDomainConnectionStatus(domain.hostname);

    return NextResponse.json(
      {
        ok: true,
        verifyResult,
        vercel,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof VercelDomainsError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode },
      );
    }
    console.error("[domains/verify] unexpected error", error);
    return NextResponse.json(
      { error: "Failed to verify domain." },
      { status: 500 },
    );
  }
}

