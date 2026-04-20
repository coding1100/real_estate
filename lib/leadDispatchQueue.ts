import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { dispatchLeadToFollowUpBoss } from "@/lib/followupboss";
import { sendLeadNotifications } from "@/lib/notifications";

type JobStatus = "pending" | "processing" | "done" | "failed";
type JobType = "followupboss" | "notifications";

type JobRow = {
  id: string;
  leadId: string;
  jobType: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
};

const TABLE_NAME = '"LeadDispatchJob"';
const JOB_TYPE_FUB: JobType = "followupboss";
const JOB_TYPE_NOTIFICATIONS: JobType = "notifications";
const LOCK_STALE_MINUTES = 5;
const BASE_RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

let ensureTablePromise: Promise<void> | null = null;

function getBackoffDelayMs(attemptCount: number): number {
  const exp = BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attemptCount - 1);
  return Math.min(exp, MAX_RETRY_DELAY_MS);
}

async function ensureLeadDispatchTable() {
  await withPrismaRetry(() =>
    prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        "id" TEXT NOT NULL,
        "leadId" TEXT NOT NULL,
        "jobType" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "attemptCount" INTEGER NOT NULL DEFAULT 0,
        "maxAttempts" INTEGER NOT NULL DEFAULT 8,
        "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lockedAt" TIMESTAMP(3),
        "lockedBy" TEXT,
        "lastError" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LeadDispatchJob_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "LeadDispatchJob_leadId_fkey"
          FOREIGN KEY ("leadId")
          REFERENCES "Lead" ("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
      );
    `),
  );
  await withPrismaRetry(() =>
    prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "LeadDispatchJob_leadId_jobType_key" ON ${TABLE_NAME}("leadId", "jobType");`,
    ),
  );
  await withPrismaRetry(() =>
    prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "LeadDispatchJob_status_nextRunAt_idx" ON ${TABLE_NAME}("status", "nextRunAt");`,
    ),
  );
}

export async function ensureLeadDispatchTableOnce() {
  if (!ensureTablePromise) {
    ensureTablePromise = ensureLeadDispatchTable().catch((err) => {
      ensureTablePromise = null;
      throw err;
    });
  }
  await ensureTablePromise;
}

async function enqueueJob(leadId: string, jobType: JobType) {
  const jobId = randomUUID();
  await withPrismaRetry(() =>
    prisma.$executeRawUnsafe(
      `INSERT INTO ${TABLE_NAME} ("id", "leadId", "jobType", "status", "attemptCount", "maxAttempts", "nextRunAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'pending', 0, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT ("leadId", "jobType") DO NOTHING`,
      jobId,
      leadId,
      jobType,
    ),
  );
}

export async function enqueueLeadDispatchJobs(leadId: string) {
  await ensureLeadDispatchTableOnce();
  await enqueueJob(leadId, JOB_TYPE_FUB);
  await enqueueJob(leadId, JOB_TYPE_NOTIFICATIONS);
}

export async function enqueueLeadDispatchJobsTx(
  tx: Prisma.TransactionClient,
  leadId: string,
) {
  const fubJobId = randomUUID();
  const notificationsJobId = randomUUID();
  await tx.$executeRawUnsafe(
    `INSERT INTO ${TABLE_NAME} ("id", "leadId", "jobType", "status", "attemptCount", "maxAttempts", "nextRunAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'pending', 0, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("leadId", "jobType") DO NOTHING`,
    fubJobId,
    leadId,
    JOB_TYPE_FUB,
  );
  await tx.$executeRawUnsafe(
    `INSERT INTO ${TABLE_NAME} ("id", "leadId", "jobType", "status", "attemptCount", "maxAttempts", "nextRunAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'pending', 0, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("leadId", "jobType") DO NOTHING`,
    notificationsJobId,
    leadId,
    JOB_TYPE_NOTIFICATIONS,
  );
}

async function claimDispatchJobs(maxJobs: number, workerId: string): Promise<JobRow[]> {
  await ensureLeadDispatchTableOnce();
  return withPrismaRetry(() =>
    prisma.$queryRawUnsafe<JobRow[]>(
      `WITH picked AS (
         SELECT "id"
         FROM ${TABLE_NAME}
         WHERE "status" IN ('pending', 'failed')
           AND "nextRunAt" <= CURRENT_TIMESTAMP
           AND "attemptCount" < "maxAttempts"
           AND (
             "lockedAt" IS NULL
             OR "lockedAt" < (CURRENT_TIMESTAMP - INTERVAL '${LOCK_STALE_MINUTES} minutes')
           )
         ORDER BY "nextRunAt" ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE ${TABLE_NAME} AS j
       SET
         "status" = 'processing',
         "lockedAt" = CURRENT_TIMESTAMP,
         "lockedBy" = $2,
         "updatedAt" = CURRENT_TIMESTAMP
       FROM picked
       WHERE j."id" = picked."id"
       RETURNING
         j."id",
         j."leadId",
         j."jobType",
         j."status",
         j."attemptCount",
         j."maxAttempts"`,
      maxJobs,
      workerId,
    ),
  );
}

async function markJobDone(jobId: string) {
  await withPrismaRetry(() =>
    prisma.$executeRawUnsafe(
      `UPDATE ${TABLE_NAME}
       SET
         "status" = 'done',
         "lockedAt" = NULL,
         "lockedBy" = NULL,
         "lastError" = NULL,
         "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      jobId,
    ),
  );
}

async function markJobFailed(job: JobRow, errorMessage: string) {
  const nextAttemptCount = (job.attemptCount ?? 0) + 1;
  const exhausted = nextAttemptCount >= (job.maxAttempts ?? 8);
  const delayMs = getBackoffDelayMs(nextAttemptCount);

  await withPrismaRetry(() =>
    prisma.$executeRawUnsafe(
      `UPDATE ${TABLE_NAME}
       SET
         "status" = 'failed',
         "attemptCount" = $2,
         "nextRunAt" = CASE
           WHEN $3::boolean THEN CURRENT_TIMESTAMP
           ELSE (CURRENT_TIMESTAMP + ($4 * INTERVAL '1 millisecond'))
         END,
         "lockedAt" = NULL,
         "lockedBy" = NULL,
         "lastError" = $5,
         "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      job.id,
      nextAttemptCount,
      exhausted,
      delayMs,
      errorMessage.slice(0, 2000),
    ),
  );
}

async function runSingleJob(job: JobRow): Promise<void> {
  console.log("[lead-dispatch-queue] Running job", {
    jobId: job.id,
    leadId: job.leadId,
    jobType: job.jobType,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
  });
  if (job.jobType === JOB_TYPE_FUB) {
    await dispatchLeadToFollowUpBoss(job.leadId, { throwOnFailure: true });
    return;
  }
  if (job.jobType === JOB_TYPE_NOTIFICATIONS) {
    await sendLeadNotifications(job.leadId, { throwOnFailure: true });
    return;
  }
  throw new Error(`Unsupported dispatch job type: ${job.jobType}`);
}

export async function processLeadDispatchQueue(options?: {
  maxJobs?: number;
  workerId?: string;
}): Promise<{ processed: number; succeeded: number; failed: number }> {
  const maxJobs = Math.min(50, Math.max(1, Math.floor(options?.maxJobs ?? 10)));
  const workerId = options?.workerId?.trim() || `worker-${randomUUID()}`;

  const jobs = await claimDispatchJobs(maxJobs, workerId);
  console.log("[lead-dispatch-queue] Claimed jobs", {
    workerId,
    requestedMaxJobs: maxJobs,
    claimed: jobs.length,
    jobIds: jobs.map((j) => j.id),
  });
  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await runSingleJob(job);
      await markJobDone(job.id);
      console.log("[lead-dispatch-queue] Job succeeded", {
        jobId: job.id,
        leadId: job.leadId,
        jobType: job.jobType,
      });
      succeeded += 1;
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "Unknown error")
          : String(error ?? "Unknown error");
      await markJobFailed(job, errorMessage);
      console.error("[lead-dispatch-queue] Job failed", {
        jobId: job.id,
        leadId: job.leadId,
        jobType: job.jobType,
        attemptCount: (job.attemptCount ?? 0) + 1,
        error: errorMessage,
      });
      failed += 1;
    }
  }

  console.log("[lead-dispatch-queue] Batch completed", {
    workerId,
    processed: jobs.length,
    succeeded,
    failed,
  });
  return { processed: jobs.length, succeeded, failed };
}

export async function countPendingLeadDispatchJobs(): Promise<number> {
  await ensureLeadDispatchTableOnce();
  const rows = await withPrismaRetry(() =>
    prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `SELECT COUNT(*) AS "count"
       FROM ${TABLE_NAME}
       WHERE "status" IN ('pending', 'failed')
         AND "nextRunAt" <= CURRENT_TIMESTAMP
         AND "attemptCount" < "maxAttempts"`,
    ),
  );
  return Number(rows[0]?.count ?? 0);
}

export async function markLeadDispatchJobDoneByType(
  leadId: string,
  jobType: JobType,
): Promise<void> {
  await ensureLeadDispatchTableOnce();
  await withPrismaRetry(() =>
    prisma.$executeRawUnsafe(
      `UPDATE ${TABLE_NAME}
       SET
         "status" = 'done',
         "lockedAt" = NULL,
         "lockedBy" = NULL,
         "lastError" = NULL,
         "updatedAt" = CURRENT_TIMESTAMP
       WHERE "leadId" = $1
         AND "jobType" = $2`,
      leadId,
      jobType,
    ),
  );
}

export type { JobStatus, JobType };
