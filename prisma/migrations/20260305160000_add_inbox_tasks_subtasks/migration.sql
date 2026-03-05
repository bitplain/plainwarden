-- CreateEnum
CREATE TYPE "InboxItemStatus" AS ENUM ('new', 'processed', 'archived');

-- CreateEnum
CREATE TYPE "InboxTypeHint" AS ENUM ('idea', 'task', 'note', 'link');

-- CreateEnum
CREATE TYPE "InboxConvertedEntityType" AS ENUM ('task', 'event', 'note');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'blocked', 'done');

-- CreateEnum
CREATE TYPE "TaskProgressMode" AS ENUM ('subtasks', 'manual');

-- CreateEnum
CREATE TYPE "SubtaskStatus" AS ENUM ('todo', 'doing', 'done');

-- CreateEnum
CREATE TYPE "SubtaskCreatedBy" AS ENUM ('user', 'ai');

-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "typeHint" "InboxTypeHint" NOT NULL DEFAULT 'task',
    "status" "InboxItemStatus" NOT NULL DEFAULT 'new',
    "convertedToEntityType" "InboxConvertedEntityType",
    "convertedToEntityId" TEXT,
    "processedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "progressMode" "TaskProgressMode" NOT NULL DEFAULT 'subtasks',
    "manualProgress" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TEXT,
    "isPriority" BOOLEAN NOT NULL DEFAULT false,
    "linkedEventId" TEXT,
    "sourceInboxItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "SubtaskStatus" NOT NULL DEFAULT 'todo',
    "estimateMin" INTEGER,
    "createdBy" "SubtaskCreatedBy" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subtask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboxItem_userId_status_createdAt_idx" ON "InboxItem"("userId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Task_linkedEventId_key" ON "Task"("linkedEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_sourceInboxItemId_key" ON "Task"("sourceInboxItemId");

-- CreateIndex
CREATE INDEX "Task_userId_dueDate_idx" ON "Task"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Task_userId_status_dueDate_idx" ON "Task"("userId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Subtask_taskId_position_key" ON "Subtask"("taskId", "position");

-- CreateIndex
CREATE INDEX "Subtask_taskId_status_idx" ON "Subtask"("taskId", "status");

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_linkedEventId_fkey" FOREIGN KEY ("linkedEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sourceInboxItemId_fkey" FOREIGN KEY ("sourceInboxItemId") REFERENCES "InboxItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
