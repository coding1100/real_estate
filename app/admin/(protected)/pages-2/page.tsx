import { LandingPagesV2Client } from "@/components/admin/LandingPagesV2Client";
import { loadLandingPagesList } from "@/lib/admin/loadLandingPagesList";

export default async function LandingPagesV2Page() {
  const { tablePages, pageOptions, domains, templates } =
    await loadLandingPagesList();

  return (
    <div className="min-h-full bg-[#F8F9FA] p-4 md:p-6">
      <LandingPagesV2Client
        pages={tablePages}
        domains={domains}
        templates={templates}
        pageOptions={pageOptions}
      />
    </div>
  );
}
