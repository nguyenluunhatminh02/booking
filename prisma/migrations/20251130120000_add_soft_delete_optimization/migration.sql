-- Ensure deleted_at column exists on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Ensure deleted_at column exists on bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Ensure created_at column exists on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();

-- Ensure created_at column exists on payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();

-- Ensure user_id column exists on bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Ensure status column exists on bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT;

-- Ensure start_time column exists on bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TIMESTAMP;

-- Soft Delete Optimization Indexes
-- These indexes ensure efficient querying of non-deleted records
-- Combined indexes speed up common filter patterns

-- User soft delete queries
-- Pattern: WHERE userId = X AND deletedAt IS NULL
CREATE INDEX idx_users_deleted_at_created_at 
ON users(deleted_at DESC, created_at DESC) 
WHERE deleted_at IS NULL;

-- Booking soft delete queries  
-- Pattern: WHERE userId = X AND deletedAt IS NULL
CREATE INDEX idx_bookings_user_deleted_at 
ON bookings(user_id, deleted_at DESC) 
WHERE deleted_at IS NULL;

-- Pattern: WHERE status = X AND deletedAt IS NULL AND startTime >= Y
CREATE INDEX idx_bookings_status_deleted_start 
ON bookings(status, deleted_at DESC, start_time DESC) 
WHERE deleted_at IS NULL;

-- Pattern: WHERE userId = X AND startTime >= Y AND deletedAt IS NULL
CREATE INDEX idx_bookings_user_start_deleted 
ON bookings(user_id, start_time DESC, deleted_at DESC) 
WHERE deleted_at IS NULL;

-- Payment soft delete queries
-- Pattern: WHERE deleted_at IS NULL ORDER BY created_at DESC
CREATE INDEX idx_payments_deleted_created 
ON payments(deleted_at DESC, created_at DESC) 
WHERE deleted_at IS NULL;

-- Composite index for audit/recovery: Find deleted records by model
CREATE INDEX idx_users_deleted_at 
ON users(deleted_at DESC) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_bookings_deleted_at 
ON bookings(deleted_at DESC) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_payments_deleted_at 
ON payments(deleted_at DESC) 
WHERE deleted_at IS NOT NULL;
