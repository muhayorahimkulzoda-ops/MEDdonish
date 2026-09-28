ALTER TABLE "payment_events" ADD COLUMN "event_key" TEXT;
UPDATE "payment_events" SET "event_key" = "id" WHERE "event_key" IS NULL;
ALTER TABLE "payment_events" ALTER COLUMN "event_key" SET NOT NULL;
CREATE UNIQUE INDEX "payment_events_event_key_key" ON "payment_events"("event_key");
