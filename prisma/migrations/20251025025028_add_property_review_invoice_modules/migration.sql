/*
  Warnings:

  - You are about to drop the column `lockedAt` on the `idempotency` table. All the data in the column will be lost.
  - You are about to drop the column `lockedBy` on the `idempotency` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `idempotency` table. All the data in the column will be lost.
  - You are about to drop the column `path` on the `idempotency` table. All the data in the column will be lost.
  - You are about to drop the column `requestPayload` on the `idempotency` table. All the data in the column will be lost.
  - You are about to drop the column `responsePayload` on the `idempotency` table. All the data in the column will be lost.
  - You are about to drop the column `retries` on the `idempotency` table. All the data in the column will be lost.
  - The `status` column on the `idempotency` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[userId,endpoint,key]` on the table `idempotency` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `endpoint` to the `idempotency` table without a default value. This is not possible if the table is not empty.
  - Made the column `expiresAt` on table `idempotency` required. This step will fail if there are existing NULL values in that column.
  - Made the column `requestHash` on table `idempotency` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('RESERVED', 'APPLIED', 'RELEASED');

-- CreateEnum
CREATE TYPE "IdemStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'TOKEN_REVOKE', 'REFRESH_REUSE', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'MFA_ENABLED', 'MFA_DISABLED', 'MFA_VERIFY_FAILED', 'ROLE_CHANGED', 'PERMISSION_CHANGED', 'DEVICE_ADDED', 'DEVICE_REMOVED', 'SUSPICIOUS_ACTIVITY');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('ACTIVE', 'DELETED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FraudDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_DECLINED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'HOLD';
ALTER TYPE "BookingStatus" ADD VALUE 'REVIEW';
ALTER TYPE "BookingStatus" ADD VALUE 'PAID';

-- DropIndex
DROP INDEX "public"."idempotency_createdAt_idx";

-- DropIndex
DROP INDEX "public"."idempotency_key_key";

-- DropIndex
DROP INDEX "public"."idempotency_status_idx";

-- DropIndex
DROP INDEX "public"."idempotency_userId_idx";

-- AlterTable
ALTER TABLE "idempotency" DROP COLUMN "lockedAt",
DROP COLUMN "lockedBy",
DROP COLUMN "method",
DROP COLUMN "path",
DROP COLUMN "requestPayload",
DROP COLUMN "responsePayload",
DROP COLUMN "retries",
ADD COLUMN     "endpoint" TEXT NOT NULL,
ADD COLUMN     "error" JSONB,
ADD COLUMN     "resourceId" TEXT,
ADD COLUMN     "response" JSONB,
DROP COLUMN "status",
ADD COLUMN     "status" "IdemStatus" NOT NULL DEFAULT 'IN_PROGRESS',
ALTER COLUMN "expiresAt" SET NOT NULL,
ALTER COLUMN "requestHash" SET NOT NULL;

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "type" "SecurityEventType" NOT NULL,
    "ip" INET,
    "userAgent" TEXT,
    "deviceFp" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "deviceFp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "amenities" JSONB DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_files" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_days" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "price" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "availability_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_bookings" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "totalPrice" INTEGER NOT NULL,
    "promoCode" CITEXT,
    "holdExpiresAt" TIMESTAMP(3),
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "appliedPromotionId" TEXT,
    "cancelPolicyId" TEXT,
    "cancelPolicySnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewDeadlineAt" TIMESTAMP(3),

    CONSTRAINT "property_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_assessments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "decision" "FraudDecision" NOT NULL DEFAULT 'PENDING',
    "reasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedNote" TEXT,

    CONSTRAINT "fraud_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_redemptions" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancel_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "checkInHour" INTEGER,
    "cutoffHour" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancel_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_events_userId_createdAt_idx" ON "security_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_userId_type_createdAt_idx" ON "security_events"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_sessionId_idx" ON "security_events"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_tokenHash_key" ON "user_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "user_sessions_userId_expiresAt_idx" ON "user_sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_createdAt_idx" ON "audit_logs"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "properties_hostId_idx" ON "properties"("hostId");

-- CreateIndex
CREATE INDEX "property_files_propertyId_isCover_idx" ON "property_files"("propertyId", "isCover");

-- CreateIndex
CREATE UNIQUE INDEX "property_files_propertyId_fileId_key" ON "property_files"("propertyId", "fileId");

-- CreateIndex
CREATE INDEX "availability_days_propertyId_date_idx" ON "availability_days"("propertyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "availability_days_propertyId_date_key" ON "availability_days"("propertyId", "date");

-- CreateIndex
CREATE INDEX "property_bookings_propertyId_idx" ON "property_bookings"("propertyId");

-- CreateIndex
CREATE INDEX "property_bookings_customerId_idx" ON "property_bookings"("customerId");

-- CreateIndex
CREATE INDEX "property_bookings_checkIn_checkOut_idx" ON "property_bookings"("checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "property_bookings_propertyId_status_idx" ON "property_bookings"("propertyId", "status");

-- CreateIndex
CREATE INDEX "property_bookings_status_holdExpiresAt_idx" ON "property_bookings"("status", "holdExpiresAt");

-- CreateIndex
CREATE INDEX "property_bookings_status_reviewDeadlineAt_idx" ON "property_bookings"("status", "reviewDeadlineAt");

-- CreateIndex
CREATE INDEX "property_bookings_propertyId_customerId_checkOut_idx" ON "property_bookings"("propertyId", "customerId", "checkOut");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- CreateIndex
CREATE INDEX "reviews_propertyId_status_createdAt_id_idx" ON "reviews"("propertyId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "reviews_authorId_createdAt_idx" ON "reviews"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "fraud_assessments_bookingId_key" ON "fraud_assessments"("bookingId");

-- CreateIndex
CREATE INDEX "fraud_assessments_userId_idx" ON "fraud_assessments"("userId");

-- CreateIndex
CREATE INDEX "fraud_assessments_level_decision_idx" ON "fraud_assessments"("level", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_redemptions_bookingId_key" ON "promotion_redemptions"("bookingId");

-- CreateIndex
CREATE INDEX "promotion_redemptions_promotionId_status_idx" ON "promotion_redemptions"("promotionId", "status");

-- CreateIndex
CREATE INDEX "promotion_redemptions_userId_idx" ON "promotion_redemptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bookingId_key" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "idempotency_endpoint_createdAt_idx" ON "idempotency"("endpoint", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_userId_endpoint_key_key" ON "idempotency"("userId", "endpoint", "key");

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_files" ADD CONSTRAINT "property_files_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_files" ADD CONSTRAINT "property_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_days" ADD CONSTRAINT "availability_days_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_bookings" ADD CONSTRAINT "property_bookings_appliedPromotionId_fkey" FOREIGN KEY ("appliedPromotionId") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_bookings" ADD CONSTRAINT "property_bookings_cancelPolicyId_fkey" FOREIGN KEY ("cancelPolicyId") REFERENCES "cancel_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_bookings" ADD CONSTRAINT "property_bookings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_bookings" ADD CONSTRAINT "property_bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "property_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_assessments" ADD CONSTRAINT "fraud_assessments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_assessments" ADD CONSTRAINT "fraud_assessments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "property_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "property_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "property_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
