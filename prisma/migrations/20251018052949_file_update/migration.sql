/*
  Warnings:

  - The `status` column on the `file_objects` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[key]` on the table `file_objects` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `entityType` on the `file_attachments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `verification_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/

CREATE EXTENSION IF NOT EXISTS citext;


-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('UPLOADING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AttachmentEntity" AS ENUM ('MESSAGE', 'POST', 'COMMENT', 'OTHER');

-- AlterTable
ALTER TABLE "file_attachments" DROP COLUMN "entityType",
ADD COLUMN     "entityType" "AttachmentEntity" NOT NULL;

-- AlterTable
ALTER TABLE "file_objects" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "declaredMime" TEXT,
ADD COLUMN     "etag" TEXT,
ADD COLUMN     "maxBytes" BIGINT,
ADD COLUMN     "sniffedMime" TEXT,
ALTER COLUMN "size" SET DATA TYPE BIGINT,
DROP COLUMN "status",
ADD COLUMN     "status" "FileStatus" NOT NULL DEFAULT 'UPLOADING';

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "ip" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE CITEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "verification_tokens" DROP COLUMN "type",
ADD COLUMN     "type" "TokenType" NOT NULL;

-- CreateIndex
CREATE INDEX "file_attachments_entityType_entityId_idx" ON "file_attachments"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "file_objects_key_key" ON "file_objects"("key");

-- CreateIndex
CREATE INDEX "file_objects_status_idx" ON "file_objects"("status");

-- CreateIndex
CREATE INDEX "file_objects_status_createdAt_idx" ON "file_objects"("status", "createdAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_expiresAt_idx" ON "refresh_tokens"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "verification_tokens_type_idx" ON "verification_tokens"("type");
