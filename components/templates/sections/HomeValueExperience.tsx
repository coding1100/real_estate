"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import { Search, Loader2 } from "lucide-react";
import type { LandingPageContent } from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import { RecaptchaScript } from "@/components/forms/Captcha";
import { DynamicForm } from "@/components/forms/DynamicForm";

type SearchState = "idle" | "loading" | "found" | "not_found" | "error";

interface ZestimateResult {
  found: boolean;
  address: string;
  lat?: number | null;
  lng?: number | null;
  estimate?: number | null;
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;

interface HomeValueLayout {
  leftMainHtml?: string;
  formHeading?: string;
  formIntro?: string;
  formFooterText?: string;
  formBgColor?: string;
  ctaBgColor?: string;
  heroLowerStripHtml?: string;
}

interface HomeValueExperienceProps {
  page: LandingPageContent;
  layout?: HomeValueLayout | null;
  formSchema?: FormSchema | null;
  utmHiddenFields?: Record<string, string | undefined>;
}

export function HomeValueExperience({
  page,
  layout,
  formSchema,
  utmHiddenFields,
}: HomeValueExperienceProps) {
  const [address, setAddress] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [result, setResult] = useState<ZestimateResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const hasFoundProperty =
    searchState === "found" && !!result && !!result.lat && !!result.lng;

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearchError(null);
    const trimmed = address.trim();
    if (!trimmed) {
      setSearchError("Please enter a property address.");
      return;
    }
    setSearchState("loading");
    try {
      const res = await fetch("/api/home-value/zestimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: trimmed }),
      });
      if (res.status === 404) {
        setResult(null);
        setSearchState("not_found");
        setSearchError(
          "We couldn’t find this property. Please check the address and try again.",
        );
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to look up property");
      }
      const data = (await res.json()) as ZestimateResult;
      if (!data.found || !data.lat || !data.lng) {
        setResult(null);
        setSearchState("not_found");
        setSearchError(
          "We couldn’t find this property. Please check the address and try again.",
        );
        return;
      }
      setResult(data);
      setSearchState("found");
    } catch (err) {
      console.error(err);
      setResult(null);
      setSearchState("error");
      setSearchError(
        "Something went wrong while fetching your home’s details. Please try again.",
      );
    }
  }

  function getMapSrc() {
    if (!MAPS_KEY || !hasFoundProperty || !result?.lat || !result.lng) {
      return null;
    }
    const center = `${result.lat},${result.lng}`;
    const url = new URL("https://www.google.com/maps/embed/v1/view");
    url.searchParams.set("key", MAPS_KEY);
    url.searchParams.set("center", center);
    url.searchParams.set("zoom", "15");
    url.searchParams.set("maptype", "roadmap");
    return url.toString();
  }

  const mapSrc = getMapSrc();

  const hasHeroRichText = !!layout?.leftMainHtml;
  const hasFormHeading = !!layout?.formHeading;
  const hasFormIntro = !!layout?.formIntro;
  const hasFooterText = !!layout?.formFooterText;
  const lowerStripHtml = layout?.heroLowerStripHtml;
  const formBgStyle = layout?.formBgColor
    ? { backgroundColor: layout.formBgColor }
    : undefined;

  return (
    <div className="relative min-h-screen text-zinc-50 bg-[#d4c8c8]">
      <RecaptchaScript />

      {/* Hero background image with warm gradient overlay */}
      {page.heroImageUrl && (
        <div className="pointer-events-none inset-0 z-0 max-h-[500px]">
          <Image
            src={page.heroImageUrl}
            alt={page.headline}
            fill
            priority
            sizes="100vw"
            className="object-cover !max-h-[800px]"
          />
          <div className="absolute inset-0 h-[800px]" />
        </div>
      )}

      <div className="relative z-10 mx-auto  flex-col px-4 pt-[140px] pb-10 md:px-0 md:pb-12">
        {/* Hero copy + search bar */}
        <div className="mx-auto  text-center h-[660px] max-w-6xl mx-auto">
          {hasHeroRichText ? (
            <div
              className="space-y-2 text-amber-50"
              dangerouslySetInnerHTML={{ __html: layout!.leftMainHtml as string }}
            />
          ) : (
            <>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-amber-50 sm:text-4xl md:text-5xl">
                {page.headline}
              </h1>
              {page.subheadline && (
                <p className="mt-3 text-sm text-amber-100/90 md:text-base">
                  {page.subheadline}
                </p>
              )}
            </>
          )}

          <form
            onSubmit={handleSearch}
            className="mt-6 flex flex-col items-stretch md:flex-row md:items-center"
          >
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-amber-200/80 ">
                <Search className="h-4 w-4 stroke-[#694636]" />
              </span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="61311 McRoberts Ln, Bend, OR 97702"
                className="w-full rounded-xl  rounded-tl-[5px] rounded-bl-[5px]  py-2.5 pl-3 pr-9 text-md focus:outline-none focus:ring-0 h-[46px] shadow-sm placeholder:text-[#453D3D] text-[#453D3D] !bg-[#ebe4e2]"
              />
            </div>
            <button
              type="submit"
              disabled={searchState === "loading"}
              className="inline-flex !h-[46px] items-center justify-center rounded-xl bg-[#5B4534] px-6 py-2.5 text-sm font-medium text-amber-50 shadow-md shadow-amber-900/40 transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {searchState === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching…
                </>
              ) : (
                "Next"
              )}
            </button>
          </form>
          {searchError && (
            <p className="mt-2 text-xs text-[#453D3D]">{searchError}</p>
          )}
        </div>
        <div className="w-full bg-[#cdbfbc]">
          <div className="mx-auto h-[100px] max-w-6xl px-0 py-[36px]">
            {lowerStripHtml ? (
              <div
                className="text-[13px] leading-snug text-[#433124]"
                dangerouslySetInnerHTML={{ __html: lowerStripHtml }}
              />
            ) : (
              <p className="text-[13px] leading-snug text-[#433124]">
                Licensed Oregon Broker | Bend &amp; Tetherow Luxury Specialist
              </p>
            )}
          </div>
        </div>
        {/* Main content: map + lead form */}
        <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start mt-[-340px] max-w-6xl  mx-auto">
          {/* Left: map */}
          <div className="overflow-hidden rounded-2xl mt-[230px]">
            {mapSrc ? (
              <iframe
                key={mapSrc}
                title={result?.address || "Property map"}
                src={mapSrc}
                className="h-[320px] w-full md:h-[380px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : hasFooterText ? (
              <div className="flex h-[280px] w-full flex-col items-center justify-center px-3 text-center md:h-[440px]">
                <div
                  className="max-w-lg text-sm text-amber-100/95"
                  dangerouslySetInnerHTML={{
                    __html: layout!.formFooterText as string,
                  }}
                />
              </div>
            ) : (
              <div className="flex h-[280px] w-full flex-col items-center justify-center gap-3  px-6 text-center md:h-[340px]">
                <p className="font-serif text-lg font-semibold text-amber-50">
                  Private. Confidential. No automated spam.
                </p>
                <p className="max-w-md text-sm text-amber-100/90">
                  Enter your property address above and we’ll pinpoint it on the
                  map, then prepare a bespoke valuation report just for you.
                </p>
              </div>
            )}
          </div>

          {/* Right: form card */}
          <div className="relative">
            <div
              className="rounded-[2px] border border-amber-100/40 bg-amber-50/95 p-5 w-full"
              style={formBgStyle}
            >
              {hasFormHeading ? (
                <div
                  className="font-serif text-lg font-semibold leading-tight text-amber-900"
                  dangerouslySetInnerHTML={{
                    __html: layout!.formHeading as string,
                  }}
                />
              ) : (
                <h2 className="font-serif text-lg font-semibold leading-tight text-amber-900">
                  Property Located!
                </h2>
              )}

              {hasFormIntro && (
                <div
                  className="mt-1 text-xs text-amber-800/80"
                  dangerouslySetInnerHTML={{
                    __html: layout!.formIntro as string,
                  }}
                />
              )}

              <div className="mt-4">
                {formSchema && formSchema.fields?.length ? (
                  <DynamicForm
                    schema={formSchema}
                    ctaText={page.ctaText}
                    successMessage={page.successMessage}
                    ctaBgColor={layout?.ctaBgColor}
                    extraHiddenFields={{
                      domain: page.domain.hostname,
                      slug: page.slug,
                      type: "home-value",
                      searchedAddress: address.trim(),
                      resolvedAddress: result?.address ?? "",
                      estimate:
                        typeof result?.estimate === "number"
                          ? String(result.estimate)
                          : "",
                      latitude:
                        typeof result?.lat === "number"
                          ? String(result.lat)
                          : "",
                      longitude:
                        typeof result?.lng === "number"
                          ? String(result.lng)
                          : "",
                      ...(utmHiddenFields ?? {}),
                    }}
                  />
                ) : (
                  <p className="text-xs text-amber-800/80">
                    No form is configured for this page yet. Add fields in the
                    Form tab in admin.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

