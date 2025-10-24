-- CreateTable
CREATE TABLE "file_objects" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'UPLOADING',
    "thumbKey" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_attachments" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_objects_status_idx" ON "file_objects"("status");

-- CreateIndex
CREATE INDEX "file_objects_createdAt_idx" ON "file_objects"("createdAt");

-- CreateIndex
CREATE INDEX "file_attachments_fileId_idx" ON "file_attachments"("fileId");

-- CreateIndex
CREATE INDEX "file_attachments_entityType_entityId_idx" ON "file_attachments"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_key_key" ON "idempotency"("key");

-- CreateIndex
CREATE INDEX "idempotency_key_idx" ON "idempotency"("key");

-- CreateIndex
CREATE INDEX "idempotency_userId_idx" ON "idempotency"("userId");

-- CreateIndex
CREATE INDEX "idempotency_status_idx" ON "idempotency"("status");

-- CreateIndex
CREATE INDEX "idempotency_createdAt_idx" ON "idempotency"("createdAt");

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
