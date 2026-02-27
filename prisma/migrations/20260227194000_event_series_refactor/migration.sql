CREATE TABLE "EventSeries" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "time" TEXT,
  "type" "EventType" NOT NULL,
  "status" "EventStatus" NOT NULL DEFAULT 'pending',
  "startDate" TEXT NOT NULL,
  "recurrenceFrequency" TEXT NOT NULL,
  "recurrenceInterval" INTEGER NOT NULL,
  "recurrenceCount" INTEGER,
  "recurrenceUntil" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventSeries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventSeries_userId_startDate_idx" ON "EventSeries" ("userId", "startDate");

INSERT INTO "EventSeries" (
  "id",
  "userId",
  "title",
  "description",
  "time",
  "type",
  "status",
  "startDate",
  "recurrenceFrequency",
  "recurrenceInterval",
  "recurrenceCount",
  "recurrenceUntil",
  "createdAt",
  "updatedAt"
)
SELECT
  ranked."recurrenceSeriesId",
  ranked."userId",
  ranked."title",
  ranked."description",
  ranked."time",
  ranked."type",
  ranked."status",
  ranked."seriesStartDate",
  COALESCE(ranked."recurrenceFrequency", 'weekly'),
  COALESCE(ranked."recurrenceInterval", 1),
  ranked."recurrenceCount",
  ranked."recurrenceUntil",
  NOW(),
  NOW()
FROM (
  SELECT
    e.*,
    MIN(e."date") OVER (PARTITION BY e."recurrenceSeriesId") AS "seriesStartDate",
    ROW_NUMBER() OVER (
      PARTITION BY e."recurrenceSeriesId"
      ORDER BY e."date" ASC, COALESCE(e."time", '99:99') ASC, e."createdAt" ASC
    ) AS rn
  FROM "Event" e
  WHERE e."recurrenceSeriesId" IS NOT NULL
) ranked
WHERE ranked.rn = 1;

ALTER TABLE "Event"
ADD CONSTRAINT "Event_recurrenceSeriesId_fkey"
FOREIGN KEY ("recurrenceSeriesId") REFERENCES "EventSeries"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event"
DROP COLUMN "recurrenceFrequency",
DROP COLUMN "recurrenceInterval",
DROP COLUMN "recurrenceCount",
DROP COLUMN "recurrenceUntil";

ALTER TABLE "EventSeries"
ADD CONSTRAINT "EventSeries_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
