/*
  Warnings:

  - You are about to drop the column `action` on the `resource_acl` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `permissions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."resource_acl_userId_action_idx";

-- DropIndex
DROP INDEX "public"."resource_acl_userId_resourceType_resourceId_action_key";

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "resource_acl" DROP COLUMN "action",
ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "roleId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "outbox_events_status_attempts_createdAt_idx" ON "outbox_events"("status", "attempts", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_name_idx" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "resource_acl_userId_resourceType_resourceId_idx" ON "resource_acl"("userId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "resource_acl_roleId_resourceType_resourceId_idx" ON "resource_acl"("roleId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");
