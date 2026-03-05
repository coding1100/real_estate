import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getDomainConnectionStatus, VercelDomainsError } from "@/lib/vercel-domains";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: NextRequest, ctx: RouteContext) {
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
    const vercel = await getDomainConnectionStatus(domain.hostname);
    return NextResponse.json(
      {
        domain: {
          id: domain.id,
          hostname: domain.hostname,
          isActive: domain.isActive,
        },
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
    console.error("[domains/status] unexpected error", error);
    return NextResponse.json(
      { error: "Failed to fetch domain status." },
      { status: 500 },
    );
  }
}

