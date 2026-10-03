CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TYPE "QueueEntryStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';

ALTER TABLE "QueueEntry"
  ADD COLUMN "publicToken" VARCHAR(64),
  ADD COLUMN "calledAt" TIMESTAMP(3),
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "noShowAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

UPDATE "QueueEntry" SET "publicToken" = replace(gen_random_uuid()::text, '-', '') WHERE "publicToken" IS NULL;
ALTER TABLE "QueueEntry" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX "QueueEntry_publicToken_key" ON "QueueEntry"("publicToken");
