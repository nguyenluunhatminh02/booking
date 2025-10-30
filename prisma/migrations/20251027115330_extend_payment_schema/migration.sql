/*
  Warnings:

  - Added the required column `updatedAt` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `refunds` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "chargeId" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "intentId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "providerRefundId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "processed_webhooks" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "intentId" TEXT,
    "chargeId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "processed_webhooks_provider_intentId_idx" ON "processed_webhooks"("provider", "intentId");

-- CreateIndex
CREATE UNIQUE INDEX "processed_webhooks_provider_eventId_key" ON "processed_webhooks"("provider", "eventId");

-- CreateIndex
CREATE INDEX "payments_intentId_idx" ON "payments"("intentId");

-- CreateIndex
CREATE INDEX "payments_chargeId_idx" ON "payments"("chargeId");
