import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getRequestHostnameFromHeaders,
  isPlatformHostname,
  isPreviewHostname,
  resolveTenantHostname,
} from "@/lib/hostnames";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

async function resolveTenantRootSlug(
  hostname: string,
  allowFallbackToAnyDomain: boolean,
): Promise<string | null> {
  const domain = await prisma.domain.findFirst({
    where: {
      hostname,
      isActive: true,
    },
    select: { id: true },
  });

  if (domain) {
    const preferredSlug = (process.env.DOMAIN_ROOT_DEFAULT_SLUG ?? "").trim();
    if (preferredSlug) {
      const preferredPage = await prisma.landingPage.findFirst({
        where: {
          domainId: domain.id,
          slug: preferredSlug,
          status: "published",
        },
        select: { slug: true },
      });
      if (preferredPage?.slug) return preferredPage.slug;
    }

    const latestPublishedPage = await prisma.landingPage.findFirst({
      where: {
        domainId: domain.id,
        status: "published",
      },
      orderBy: { updatedAt: "desc" },
      select: { slug: true },
    });
    return latestPublishedPage?.slug ?? null;
  }

  if (!allowFallbackToAnyDomain) return null;

  const fallbackPage = await prisma.landingPage.findFirst({
    where: {
      status: "published",
      domain: { isActive: true },
    },
    orderBy: { updatedAt: "desc" },
    select: { slug: true },
  });
  return fallbackPage?.slug ?? null;
}

function PlatformHome() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}

export default async function Home() {
  const rawHostname = await getRequestHostnameFromHeaders();
  const hostname = resolveTenantHostname(rawHostname);

  // For the main platform hostname (including localhost during development),
  // send root requests ("/") to the master seller template preview.
  if (isPlatformHostname(hostname)) {
    redirect("/master-seller");
  }

  if (!isPlatformHostname(hostname)) {
    const tenantRootSlug = await resolveTenantRootSlug(
      hostname,
      isPreviewHostname(rawHostname),
    );
    if (tenantRootSlug) {
      redirect(`/${tenantRootSlug}`);
    }
    notFound();
  }

  return <PlatformHome />;
}
