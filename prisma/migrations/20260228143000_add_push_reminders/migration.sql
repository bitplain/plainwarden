-- CreateEnum
CREATE TYPE "AgentReminderKind" AS ENUM ('due_today', 'due_tomorrow', 'overdue');

-- CreateEnum
CREATE TYPE "AgentReminderChannel" AS ENUM ('in_app', 'push');

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "expirationTime" TIMESTAMP(3),
    "userAgent" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "AgentReminderKind" NOT NULL,
    "channel" "AgentReminderChannel" NOT NULL DEFAULT 'in_app',
    "severity" INTEGER NOT NULL DEFAULT 1,
    "dueDate" TEXT,
    "navigateTo" TEXT,
    "dedupeBucket" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "pushedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_disabledAt_idx" ON "PushSubscription"("userId", "disabledAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentReminder_dedupeKey_key" ON "AgentReminder"("dedupeKey");

-- CreateIndex
CREATE INDEX "AgentReminder_userId_readAt_createdAt_idx" ON "AgentReminder"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "AgentReminder_userId_pushedAt_createdAt_idx" ON "AgentReminder"("userId", "pushedAt", "createdAt");

-- CreateIndex
CREATE INDEX "AgentReminder_userId_sourceType_sourceId_idx" ON "AgentReminder"("userId", "sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReminder" ADD CONSTRAINT "AgentReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
