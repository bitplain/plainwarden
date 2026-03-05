-- AlterTable
ALTER TABLE "AgentReminder"
ADD COLUMN "pushAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextPushAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastPushAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastPushError" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "AgentReminder_userId_pushedAt_createdAt_idx";

-- CreateIndex
CREATE INDEX "AgentReminder_userId_pushedAt_nextPushAttemptAt_createdAt_idx"
ON "AgentReminder"("userId", "pushedAt", "nextPushAttemptAt", "createdAt");
