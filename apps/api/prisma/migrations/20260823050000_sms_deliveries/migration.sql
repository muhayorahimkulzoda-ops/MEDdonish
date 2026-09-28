-- CreateEnum
CREATE TYPE "SmsDeliveryStatus" AS ENUM ('queued', 'sent', 'failed');

-- CreateTable
CREATE TABLE "sms_deliveries" (
    "id" UUID NOT NULL,
    "phone_masked" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "SmsDeliveryStatus" NOT NULL DEFAULT 'queued',
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sms_deliveries_created_at_idx" ON "sms_deliveries"("created_at");

-- CreateIndex
CREATE INDEX "sms_deliveries_status_created_at_idx" ON "sms_deliveries"("status", "created_at");
