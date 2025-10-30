-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "bookings_deletedAt_idx" ON "bookings"("deletedAt");

-- CreateIndex
CREATE INDEX "bookings_userId_status_createdAt_idx" ON "bookings"("userId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "bookings_userId_startTime_endTime_idx" ON "bookings"("userId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "bookings_status_startTime_idx" ON "bookings"("status", "startTime");

-- CreateIndex
CREATE INDEX "bookings_status_createdAt_idx" ON "bookings"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payments_deletedAt_idx" ON "payments"("deletedAt");

-- CreateIndex
CREATE INDEX "payments_provider_status_createdAt_idx" ON "payments"("provider", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "properties_hostId_createdAt_idx" ON "properties"("hostId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "properties_lat_lng_idx" ON "properties"("lat", "lng");

-- CreateIndex
CREATE INDEX "properties_ratingAvg_createdAt_idx" ON "properties"("ratingAvg" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "property_bookings_customerId_status_createdAt_idx" ON "property_bookings"("customerId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "property_bookings_customerId_checkIn_checkOut_idx" ON "property_bookings"("customerId", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "property_bookings_propertyId_checkIn_checkOut_idx" ON "property_bookings"("propertyId", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");
