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
    domainId,
    slug,
    type,
    masterTemplateId,
    headline,
    subheadline,
  } = body ?? {};

  if (!domainId || !slug || !type || !masterTemplateId || !headline) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const page = await prisma.landingPage.create({
    data: {
      domainId,
      slug,
      type,
      masterTemplateId,
      status: "draft",
      headline,
      subheadline,
      sections: {},
      ctaText: "Get Access",
      successMessage: "Thank you! We'll be in touch shortly.",
    },
  });

  return NextResponse.json({ page }, { status: 201 });
}

