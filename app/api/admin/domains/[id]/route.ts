import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { isLikelyPublicHostname, normalizeHostname } from "@/lib/hostnames";
import {
  addDomainToProject,
  getDomainConnectionStatus,
  removeProjectDomain,
  VercelDomainsError,
} from "@/lib/vercel-domains";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type VercelStatusResult = {
  vercel: unknown | null;
  vercelError?: {
    code: string;
    message: string;
    statusCode: number;
  };
};

async function safeReadVercelStatus(hostname: string): Promise<VercelStatusResult> {
  try {
    const vercel = await getDomainConnectionStatus(hostname);
    return { vercel };
  } catch (error) {
    if (error instanceof VercelDomainsError) {
      return {
        vercel: null,
        vercelError: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
        },
      };
    }
    return {
      vercel: null,
      vercelError: {
        code: "VERCEL_STATUS_UNKNOWN_ERROR",
        message: "Domain updated but failed to read Vercel status.",
        statusCode: 500,
      },
    };
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id } = await ctx.params;
  let existing;
  try {
    existing = await prisma.domain.findUnique({ where: { id } });
  } catch (error: unknown) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? ((error as { code: string }).code)
        : null;

    if (code === "ETIMEDOUT") {
      console.error(
        "[domains] prisma.domain.findUnique timed out while loading domain for PATCH",
        { id, error },
      );
      return NextResponse.json(
        {
          error:
            "The database request timed out while loading this domain. Please try again in a moment.",
        },
        { status: 503 },
      );
    }

    console.error(
      "[domains] prisma.domain.findUnique failed while loading domain for PATCH",
      { id, error },
    );
    return NextResponse.json(
      { error: "Failed to load domain from the database." },
      { status: 500 },
    );
  }
  if (!existing) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const nextHostname = normalizeHostname(
    typeof body.hostname === "string" ? body.hostname : existing.hostname,
  );
  if (!isLikelyPublicHostname(nextHostname)) {
    return NextResponse.json(
      { error: "Please provide a valid public hostname (e.g. example.com)." },
      { status: 400 },
    );
  }

  const hostnameChanged = nextHostname !== existing.hostname;
  if (hostnameChanged) {
    try {
      await addDomainToProject(nextHostname);
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
      console.error("[domains] failed to add renamed hostname to Vercel", error);
      return NextResponse.json(
        { error: "Failed to add domain to Vercel project." },
        { status: 502 },
      );
    }
  }

  let domain;
  try {
    domain = await prisma.domain.update({
      where: { id },
      data: {
        hostname: nextHostname,
        displayName:
          typeof body.displayName === "string"
            ? body.displayName
            : existing.displayName,
        notifyEmail:
          typeof body.notifyEmail === "string"
            ? body.notifyEmail
            : existing.notifyEmail,
        notifySms: Object.prototype.hasOwnProperty.call(body, "notifySms")
          ? body.notifySms
          : existing.notifySms,
        isActive:
          typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
        ga4Id: Object.prototype.hasOwnProperty.call(body, "ga4Id")
          ? body.ga4Id
          : existing.ga4Id,
        metaPixelId: Object.prototype.hasOwnProperty.call(body, "metaPixelId")
          ? body.metaPixelId
          : existing.metaPixelId,
        logoUrl: Object.prototype.hasOwnProperty.call(body, "logoUrl")
          ? body.logoUrl
          : existing.logoUrl,
        faviconUrl: Object.prototype.hasOwnProperty.call(body, "faviconUrl")
          ? body.faviconUrl
          : existing.faviconUrl,
        agentPhoto: Object.prototype.hasOwnProperty.call(body, "rightLogoUrl")
          ? body.rightLogoUrl
          : existing.agentPhoto,
        linkedinUrl: Object.prototype.hasOwnProperty.call(body, "linkedinUrl")
          ? body.linkedinUrl
          : existing.linkedinUrl,
        linkedinVisible: Object.prototype.hasOwnProperty.call(
          body,
          "linkedinVisible",
        )
          ? body.linkedinVisible
          : existing.linkedinVisible,
        googleUrl: Object.prototype.hasOwnProperty.call(body, "googleUrl")
          ? body.googleUrl
          : existing.googleUrl,
        googleVisible: Object.prototype.hasOwnProperty.call(
          body,
          "googleVisible",
        )
          ? body.googleVisible
          : existing.googleVisible,
        facebookUrl: Object.prototype.hasOwnProperty.call(body, "facebookUrl")
          ? body.facebookUrl
          : existing.facebookUrl,
        facebookVisible: Object.prototype.hasOwnProperty.call(
          body,
          "facebookVisible",
        )
          ? body.facebookVisible
          : existing.facebookVisible,
        instagramUrl: Object.prototype.hasOwnProperty.call(
          body,
          "instagramUrl",
        )
          ? body.instagramUrl
          : existing.instagramUrl,
        instagramVisible: Object.prototype.hasOwnProperty.call(
          body,
          "instagramVisible",
        )
          ? body.instagramVisible
          : existing.instagramVisible,
        zillowUrl: Object.prototype.hasOwnProperty.call(body, "zillowUrl")
          ? body.zillowUrl
          : existing.zillowUrl,
        zillowVisible: Object.prototype.hasOwnProperty.call(
          body,
          "zillowVisible",
        )
          ? body.zillowVisible
          : existing.zillowVisible,
      },
    });
  } catch (error: unknown) {
    if (hostnameChanged) {
      try {
        await removeProjectDomain(nextHostname);
      } catch (rollbackError) {
        console.error(
          "[domains] failed to rollback renamed Vercel domain after DB error",
          { hostname: nextHostname, rollbackError },
        );
      }
    }

    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? ((error as { code: string }).code)
        : null;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "This hostname already exists." },
        { status: 409 },
      );
    }
    console.error("[domains] failed to update domain", error);
    return NextResponse.json(
      { error: "Failed to update domain." },
      { status: 500 },
    );
  }

  if (hostnameChanged) {
    try {
      await removeProjectDomain(existing.hostname);
    } catch (error) {
      console.error(
        "[domains] hostname updated but failed removing old Vercel domain",
        { oldHostname: existing.hostname, error },
      );
    }
  }

  const status = await safeReadVercelStatus(nextHostname);
  return NextResponse.json(
    {
      domain,
      vercel: status.vercel,
      ...(status.vercelError ? { vercelError: status.vercelError } : {}),
    },
    { status: 200 },
  );
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
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
    await removeProjectDomain(domain.hostname);
  } catch (error) {
    if (!(error instanceof VercelDomainsError)) {
      console.error("[domains] failed removing Vercel domain", error);
      return NextResponse.json(
        { error: "Failed to remove domain from Vercel project." },
        { status: 502 },
      );
    }
    // If Vercel is not configured or returns a non-404 issue, surface it.
    if (error.code !== "VERCEL_DOMAINS_DISABLED" && error.statusCode !== 404) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode },
      );
    }
  }

  await prisma.domain.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

