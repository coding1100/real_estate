import { processLeadDispatchQueue } from "@/lib/leadDispatchQueue";

async function main() {
  const maxJobsRaw = Number(process.env.LEAD_DISPATCH_MAX_JOBS ?? "50");
  const maxJobs = Number.isFinite(maxJobsRaw)
    ? Math.min(100, Math.max(1, Math.floor(maxJobsRaw)))
    : 50;
  const workerId = `script-${Date.now()}`;

  const result = await processLeadDispatchQueue({ maxJobs, workerId });
  console.log("[lead-dispatch-queue] processed", result);
}

main().catch((error) => {
  console.error("[lead-dispatch-queue] failed", error);
  process.exit(1);
});
