ALTER TABLE "Event"
ADD COLUMN "recurrenceSeriesId" TEXT,
ADD COLUMN "recurrenceFrequency" TEXT,
ADD COLUMN "recurrenceInterval" INTEGER,
ADD COLUMN "recurrenceCount" INTEGER,
ADD COLUMN "recurrenceUntil" TEXT,
ADD COLUMN "recurrenceException" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Event_userId_recurrenceSeriesId_date_idx"
ON "Event" ("userId", "recurrenceSeriesId", "date");
