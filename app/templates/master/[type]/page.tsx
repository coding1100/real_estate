import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { LandingPageType } from "@/lib/types/page";

type RouteParams = {
  params: Promise<{
    type: LandingPageType;
  }>;
};

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { type } = await params;

  const masterSlug = type === "buyer" ? "master-buyer" : "master-seller";

  return {
    title: `${masterSlug} (${type}) – Master template`,
    robots: { index: false, follow: false },
  };
}

export default async function MasterTemplatePreview({
  params,
}: RouteParams) {
  const { type } = await params;

  const masterSlug = type === "buyer" ? "master-buyer" : "master-seller";

  redirect(`/${masterSlug}`);
}

