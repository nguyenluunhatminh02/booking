/*
  Warnings:

  - Added the required column `updatedAt` to the `promotions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `promotions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "maxUses" INTEGER,
ADD COLUMN     "minNights" INTEGER,
ADD COLUMN     "minTotal" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usageLimit" INTEGER,
ADD COLUMN     "usedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "value" INTEGER NOT NULL,
ALTER COLUMN "discount" SET DEFAULT 0,
ALTER COLUMN "validFrom" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '{}'::jsonb;
