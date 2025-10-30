# 🏗️ ARCHITECTURE.md - Project Overview & Design

This is the single source of truth for project architecture. All legacy documentation files have been archived in `/docs/`.

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Core Patterns & Concepts](#core-patterns--concepts)
5. [Module Descriptions](#module-descriptions)
6. [Database Design](#database-design)
7. [Security Model](#security-model)
8. [API Response Standards](#api-response-standards)
9. [Common Tasks](#common-tasks)

---

## Project Overview

**NestJS Production-Ready Booking System**  
Enterprise-grade backend with:
- ✅ Role-Based Access Control (RBAC)
- ✅ Payment Processing (Stripe, VNPay, Mock)
- ✅ Distributed Transactions (Saga Pattern)
- ✅ Transactional Outbox
- ✅ Idempotency
- ✅ Audit Logging
- ✅ Rate Limiting (Token Bucket)
- ✅ Email Service Integration

---

## Technology Stack

### Core
- **Framework**: NestJS 11.1.6 (Express-based)
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 14+ (Prisma ORM)
- **Validation**: Zod + class-validator

### Key Libraries
```json
{
  "@nestjs/core": "11.1.6",
  "@nestjs/config": "4.0.2",
  "@nestjs/jwt": "11.0.1",
  "@nestjs/schedule": "6.0.1",
  "@nestjs/throttler": "6.4.0",
  "@nestjs/bullmq": "11.0.4",
  "@prisma/client": "6.17.1",
  "ioredis": "5.8.1",
  "bullmq": "5.61.0",
  "nestjs-cls": "6.0.1",
  "nestjs-pino": "4.4.1",
  "nestjs-zod": "5.0.1",
  "meilisearch": "0.53.0",
  "stripe": "19.1.0"
}
```

### DevTools
- **Build**: SWC (fast TypeScript compiler)
- **Testing**: Jest
- **Linting**: ESLint
- **Code Format**: Prettier
- **Logger**: Pino (structured logging)

---

## Directory Structure

```
src/
├── common/                          # Shared infrastructure layer
│   ├── decorators/                 # Custom decorators
│   │   ├── current-user.ts         # @CurrentUser() - Get logged-in user
│   │   ├── public.ts               # @Public() - Skip authentication
│   │   ├── permissions.ts          # @RequirePermissions() - Check permissions
│   │   └── index.ts                # Barrel export
│   │
│   ├── guards/                     # Authentication & Authorization
│   │   ├── jwt-auth.guard.ts       # JWT token validation
│   │   ├── custom-throttler.guard.ts  # Rate limiting
│   │   ├── acl.guard.ts            # Access control list
│   │   ├── roles.guard.ts          # Role-based access (deprecated - use RoleGuard)
│   │   └── index.ts
│   │
│   ├── interceptors/               # Request/Response transformation
│   │   ├── logging.interceptor.ts  # Request/response logging
│   │   ├── timeout.interceptor.ts  # Request timeout handling
│   │   ├── transform.interceptor.ts # Response wrapping
│   │   ├── slow-request.interceptor.ts # Performance monitoring
│   │   ├── audit.interceptor.ts    # Audit trail recording
│   │   ├── idempotency.interceptor.ts # Prevent duplicate operations
│   │   └── index.ts
│   │
│   ├── filters/                    # Exception handling
│   │   ├── global-exception.filter.ts    # Catch-all exceptions
│   │   ├── http-exception.filter.ts      # HTTP errors
│   │   ├── prisma-client-exception.filter.ts # Database errors
│   │   ├── too-many-requests.filter.ts   # Rate limit errors (429)
│   │   ├── all-exceptions.filter.ts      # Universal handler
│   │   └── index.ts
│   │
│   ├── pipes/                      # Input validation
│   │   ├── validation.pipe.ts      # DTO validation
│   │   ├── parse-uuid.pipe.ts      # UUID parsing
│   │   └── index.ts
│   │
│   ├── services/                   # Shared services
│   │   ├── email.service.ts        # SendGrid email sending
│   │   └── redis.service.ts        # Redis client management
│   │
│   ├── dto/                        # Shared DTOs
│   │   ├── pagination.dto.ts       # Pagination inputs
│   │   ├── response.dto.ts         # Standard API responses
│   │   ├── upload.dto.ts           # File upload validation
│   │   └── index.ts
│   │
│   ├── utils/                      # Helper functions
│   │   ├── password.ts             # Password hashing/comparison
│   │   ├── token.ts                # Token generation
│   │   ├── formatters.ts           # Data formatting
│   │   └── index.ts
│   │
│   ├── constants/                  # Application constants
│   │   ├── messages.ts             # Standard messages
│   │   └── index.ts
│   │
│   ├── exceptions/                 # Custom exceptions
│   │   └── index.ts
│   │
│   ├── interfaces/                 # TypeScript interfaces
│   ├── types/                      # TypeScript types
│   ├── helpers/                    # Helper classes
│   ├── mapping/                    # Data mapping
│   ├── middlewares/                # Express middlewares
│   └── redis.module.ts             # Global Redis module
│
├── config/                         # Application configuration
│   ├── app/                        # App config
│   │   ├── app.config.ts           # App-level settings (env, port, baseUrl)
│   │   └── index.ts
│   │
│   ├── validate-env.ts             # Environment variable validation
│   └── pino-logger.config.ts       # Logger configuration
│
├── core/                           # Core application features
│   ├── queue/                      # Job queue system (BullMQ)
│   │   ├── queue.module.ts         # Queue registration
│   │   ├── producers/              # Queue producers
│   │   ├── consumers/              # Queue consumers
│   │   └── events/                 # Queue event definitions
│   │
│   ├── rate-limit/                 # Token bucket rate limiting
│   │   ├── rate-limit.module.ts
│   │   ├── rate-limit.decorator.ts # @RateLimit() decorator
│   │   ├── rate-limit.service.ts   # Algorithm implementation
│   │   └── token-bucket.ts         # Token bucket algorithm
│   │
│   ├── sagas/                      # Distributed transaction orchestration
│   │   ├── sagas.module.ts
│   │   ├── saga.orchestrator.ts    # Main orchestrator
│   │   ├── booking-cancellation.saga.ts  # Cancellation flow
│   │   └── payment-refund.saga.ts  # Payment reversal flow
│   │
│   └── tasks/                      # Scheduled tasks (cron jobs)
│       ├── tasks.module.ts
│       ├── booking.tasks.ts        # Booking reminders, auto-cancel
│       └── cleanup.tasks.ts        # Orphaned record cleanup
│
├── modules/                        # Feature modules (business logic)
│   ├── auth/                       # Authentication & Authorization
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts         # Core auth logic
│   │   ├── auth.controller.ts      # Auth endpoints
│   │   ├── strategies/             # Passport strategies (JWT, Local)
│   │   ├── guards/                 # Auth-specific guards
│   │   ├── dto/                    # Request/response DTOs
│   │   ├── token-state.service.ts  # Token validation & storage
│   │   ├── device-approval.service.ts  # Device tracking
│   │   └── utils/                  # Auth helpers
│   │
│   ├── users/                      # User management
│   │   ├── users.module.ts
│   │   ├── users.service.ts        # CRUD operations
│   │   ├── users.controller.ts     # User endpoints
│   │   ├── dto/                    # User DTOs
│   │   └── entities/               # User entities
│   │
│   ├── booking/                    # Core booking functionality
│   │   ├── booking.module.ts
│   │   ├── bookings.service.ts     # Business logic
│   │   ├── bookings.controller.ts  # REST endpoints
│   │   ├── dto/                    # Booking DTOs
│   │   └── entities/               # Domain models
│   │
│   ├── payment/                    # Payment processing
│   │   ├── payment.service.ts      # Main service
│   │   ├── providers/              # Payment provider adapters
│   │   │   ├── provider.adapter.ts # Interface
│   │   │   ├── mock.adapter.ts     # Mock implementation
│   │   │   ├── stripe.adapter.ts   # Stripe integration
│   │   │   └── vnpay.adapter.ts    # VNPay integration
│   │   ├── dto/                    # Payment DTOs
│   │   └── payment.controller.ts
│   │
│   ├── rbac/                       # Role-Based Access Control
│   │   ├── rbac.module.ts
│   │   ├── permissions.service.ts  # Permission management
│   │   ├── roles.service.ts        # Role management
│   │   ├── decorators/             # @RequirePermissions(), @RequireRoles()
│   │   ├── guards/                 # Permission & role guards
│   │   ├── dto/                    # RBAC DTOs
│   │   └── constants/              # Permission definitions
│   │
│   ├── acl/                        # Access Control List (fine-grained)
│   │   ├── acl.module.ts
│   │   ├── acl.service.ts          # ACL logic
│   │   ├── dto/                    # ACL DTOs
│   │   └── acl.controller.ts
│   │
│   ├── outbox/                     # Transactional Outbox Pattern
│   │   ├── outbox.module.ts
│   │   ├── outbox-event.service.ts # Event persistence
│   │   ├── outbox.producer.ts      # Event publishing to queue
│   │   ├── outbox-processor.module.ts # Background processing
│   │   ├── dto/                    # Event DTOs
│   │   └── processors/             # Event handlers
│   │
│   ├── idempotency/                # Idempotency management
│   │   ├── idempotency.module.ts
│   │   ├── idempotency.service.ts  # Idempotency checks
│   │   ├── idempotency.controller.ts
│   │   └── dto/
│   │
│   ├── audit-log/                  # Audit trail
│   │   ├── audit-log.module.ts
│   │   ├── audit-log.service.ts
│   │   ├── audit-log.controller.ts
│   │   └── dto/
│   │
│   ├── notifications/              # Email/Push notifications
│   │   ├── notifications.module.ts
│   │   ├── notifications.service.ts
│   │   ├── templates/              # Email templates
│   │   └── dto/
│   │
│   ├── property/                   # Property listing management
│   │   ├── property.module.ts
│   │   ├── property.service.ts
│   │   ├── property.controller.ts
│   │   └── dto/
│   │
│   ├── review/                     # Review & rating system
│   │   ├── review.module.ts
│   │   ├── review.service.ts
│   │   ├── review.controller.ts
│   │   └── dto/
│   │
│   ├── search/                     # Full-text search (Meilisearch)
│   │   ├── search.module.ts
│   │   ├── search.service.ts
│   │   ├── search.controller.ts
│   │   └── dto/
│   │
│   ├── files/                      # File management (S3/R2)
│   │   ├── files.module.ts
│   │   ├── files.service.ts        # Upload/download handling
│   │   ├── files.controller.ts     # File endpoints
│   │   ├── dto/                    # File DTOs
│   │   └── utils/
│   │
│   ├── security-events/            # Security event tracking
│   │   ├── security-events.module.ts
│   │   ├── security-events.service.ts
│   │   └── dto/
│   │
│   ├── invoice/                    # Invoice generation
│   │   ├── invoice.module.ts
│   │   ├── invoice.service.ts
│   │   ├── invoice.controller.ts
│   │   └── dto/
│   │
│   ├── mailer/                     # Email sending service
│   │   ├── mailer.module.ts
│   │   ├── mailer.service.ts
│   │   ├── templates/
│   │   └── dto/
│   │
│   ├── admin/                      # Admin operations
│   │   ├── admin.module.ts
│   │   ├── admin.service.ts
│   │   ├── admin.controller.ts
│   │   └── dto/
│   │
│   ├── promotion/                  # Promotion & discount management
│   │   ├── promotion.module.ts
│   │   ├── promotion.service.ts
│   │   ├── promotion.controller.ts
│   │   └── dto/
│   │
│   └── mfa/                        # Multi-Factor Authentication
│       ├── mfa.module.ts
│       ├── mfa.service.ts
│       ├── mfa.controller.ts
│       └── dto/
│
├── prisma/                         # Database layer
│   ├── prisma.module.ts            # Prisma module
│   ├── prisma.service.ts           # Client management & extensions
│   ├── prisma.extensions.ts        # Prisma extensions (middleware)
│   ├── migrations/                 # Database migrations
│   └── schema.prisma               # Database schema
│
├── app.module.ts                   # Root module (imports all)
├── app.service.ts
├── app.controller.ts
├── main.ts                         # Application entry point
└── utils/                          # Global utilities

prisma/
├── schema.prisma                   # Database schema (ORM model definitions)
└── migrations/                     # Database migration history

test/                              # Test files
├── jest-e2e.json                  # E2E test config
└── *.e2e-spec.ts                  # E2E tests

docs/                              # Documentation (archived)
├── [old documentation files]       # Historical docs
└── README.md                       # Doc index

.env.example                        # Environment variables template
.env                               # Actual env (git-ignored)
tsconfig.json                      # TypeScript config
nest-cli.json                      # NestCLI config
```

---

## Core Patterns & Concepts

### 1. **Guard Chain (Security Layers)**
```
Request → CustomThrottlerGuard → JwtAuthGuard → PermissionsGuard → RoleGuard → Handler
         [Rate Limit]           [Auth]        [Granular]        [Role]
```

**Order matters**: Rate limit first (performance), then auth, then authorization.

### 2. **Dependency Injection (DI)**
```typescript
@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,      // Inject database
    private outbox: OutboxEventService, // Inject event publisher
    private saga: SagaOrchestrator,     // Inject workflow engine
  ) {}
}
```

### 3. **Request Context (CLS)**
```typescript
// Context stored per-request:
- requestId: Unique request identifier
- userId: Current user ID
- workspaceId: Multi-tenant workspace
- ip: Client IP
- method: HTTP method
- url: Request path

// Accessible from any service:
private readonly cls: ClsService
const userId = this.cls.get('userId');
```

### 4. **Error Handling Pipeline**
```
Thrown Exception → Global Filter → Standard Response Format
                  ├─ PrismaClientExceptionFilter
                  ├─ HttpExceptionFilter
                  ├─ TooManyRequestsFilter
                  └─ AllExceptionsFilter (catch-all)

Response Format:
{
  ok: false,
  error: {
    code: "USER_NOT_FOUND",
    message: "User does not exist",
    details: { userId: "..." }
  },
  timestamp: "2025-10-28T10:30:00Z",
  path: "/api/users/123"
}
```

### 5. **Transactional Outbox Pattern**
```
Booking Create:
1. Create booking in DB (transaction)
2. Create OutboxEvent in same transaction ✓
   → If commit succeeds, event persists
   → If commit fails, no event (automatic rollback)
3. Background processor picks event
4. Publishes to queue/subscribers
5. Marks event as SENT (or FAILED for retry)

Benefit: No message loss + exactly-once semantics
```

### 6. **Saga Pattern (Distributed Transactions)**
```
BookingCancellationSaga:
1. Validate booking exists
2. Cancel booking (set status = CANCELLED)
3. Trigger refund (if paid)
4. Send notification
5. Log audit event

If any step fails → Rollback all previous steps
```

### 7. **Idempotency**
```typescript
@Post('/bookings')
@Idempotent()  // Enable idempotency
async create(
  @Body() dto: CreateBookingDto,
  @Header('Idempotency-Key') key: string  // Unique key from client
) {
  // Same key sent within 24h → Returns cached response
  // Prevents duplicate bookings if client retries
}
```

### 8. **Rate Limiting (Token Bucket)**
```
Capacity (B): 100 concurrent requests
Refill rate (r): 10 tokens/second = 600/minute

Algorithm:
- Each request costs 1 token
- Tokens refill at rate r
- If capacity exceeded → 429 Too Many Requests
- Per-user/per-IP/per-workspace configurable
```

---

## Module Descriptions

### Auth Module
- **Login**: Email + password → JWT tokens
- **Register**: New user creation with validation
- **Refresh Token**: Extend session
- **Password Management**: Reset, change, forgot
- **2FA/MFA**: TOTP, device approval
- **Token Revocation**: Logout/blacklist

**Key Files**:
- `auth.service.ts` - Business logic
- `strategies/jwt.strategy.ts` - Passport JWT strategy
- `strategies/local.strategy.ts` - Passport local strategy
- `token-state.service.ts` - Token validation

### Booking Module
- **Create Booking**: New booking in DRAFT status
- **Update Booking**: Modify draft bookings
- **Cancel Booking**: Saga-based cancellation
- **Confirm Booking**: Move to CONFIRMED status
- **Find Bookings**: User's bookings with filters

**Status Flow**:
```
DRAFT → PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
              ↘ (cancel) → CANCELLED → REFUND_PENDING → REFUNDED
```

### Payment Module
- **Create Intent**: Initialize payment
- **Process Payment**: Charge user
- **Refund**: Reverse transaction
- **Adapter Pattern**: Support multiple providers

**Supported Providers**:
- **MOCK**: Testing (always succeeds)
- **STRIPE**: Production payment processor
- **VNPAY**: Vietnamese payment gateway

### RBAC Module
- **Permissions**: Fine-grained actions (CREATE, READ, UPDATE, DELETE)
- **Roles**: GROUP permissions (USER, ADMIN, MODERATOR)
- **Mapping**: Assign permissions to roles
- **Check**: Verify user has permission

**Example**:
```typescript
Permissions.BOOKING.CREATE = "booking.create"
Permissions.BOOKING.READ = "booking.read"

ADMIN role = [all permissions]
USER role = [booking.create, booking.read, booking.update (own), payment.create]

@RequirePermissions([Permissions.BOOKING.CREATE])
async create(...) {}
```

### Outbox Module
- **Persist Events**: Write events in transaction
- **Publish**: Move from PENDING → ENQUEUED
- **Process**: Handle events in background
- **Retry**: Failed events get retried

**Event Example**:
```
Topic: "booking.events"
Key: "booking-123"  // Partition key
Payload: {
  type: "booking.created",
  bookingId: "...",
  userId: "...",
  amount: "..."
}
```

### Security Events Module
- **Track**: Login, logout, password change, role change
- **Audit**: Who did what, when, from where
- **Alerts**: Suspicious activity detection
- **Forensics**: Investigation support

---

## Database Design

### Core Tables

**User**
```prisma
model User {
  id            String     @id @default(cuid())
  email         String     @unique
  password      String     // Argon2 hashed
  firstName     String
  lastName      String
  role          SystemRole @default(USER)
  isActive      Boolean    @default(true)
  emailVerified Boolean    @default(false)
  lastLoginAt   DateTime?
  version       Int        @default(0)  // Cache invalidation
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  deletedAt     DateTime?  // Soft delete

  // Relations
  bookings      Booking[]
  sessions      Session[]
  auditLogs     AuditLog[]
  
  @@index([email])
  @@index([role])
  @@index([deletedAt])
}
```

**Booking**
```prisma
model Booking {
  id           String         @id @default(cuid())
  userId       String         // Who booked
  title        String         // Booking title
  description  String?
  notes        String?
  
  // Financial
  amount       Decimal        @db.Numeric(19, 2)  // NOT Float!
  currency     String         @default("VND")
  discount     Decimal        @default(0) @db.Numeric(19, 2)
  tax          Decimal        @default(0) @db.Numeric(19, 2)
  finalAmount  Decimal        @db.Numeric(19, 2)
  
  // Timing
  startTime    DateTime
  endTime      DateTime
  duration     Int            // Minutes
  timezone     String?
  
  // Status
  status       BookingStatus  @default(DRAFT)
  
  // Metadata
  tags         String[]
  metadata     Json?
  
  // Soft delete
  deletedAt    DateTime?
  
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  
  user         User           @relation(fields: [userId], references: [id])
  payments     Payment[]
  
  @@index([userId, status, deletedAt])
  @@index([startTime, endTime])
  @@index([status, createdAt])
}
```

**OutboxEvent**
```prisma
model OutboxEvent {
  id        String       @id @default(cuid())
  topic     String       // "booking.events", "payment.events"
  key       String       // Partition key (userId, bookingId, etc.)
  payload   Json         // Event data
  
  status    OutboxStatus @default(PENDING)  // PENDING → ENQUEUED → SENT
  attempts  Int          @default(0)
  error     String?
  
  dedupeKey String?      @unique  // Prevent duplicate events
  
  createdAt DateTime     @default(now())
  enqueuedAt DateTime?
  sentAt    DateTime?
  
  @@index([status, createdAt])
  @@index([topic, status])
}
```

### Important Patterns

1. **Soft Delete**: `deletedAt` field
   - Queries must filter: `WHERE deletedAt IS NULL`
   - Recoverable if needed
   - Compliance/audit trail

2. **Decimal for Money**: NOT Float!
   ```prisma
   amount Decimal @db.Numeric(19, 2)  // Accurate cents
   // NOT: amount Float (precision loss)
   ```

3. **Indexing Strategy**:
   ```prisma
   @@index([userId, status, deletedAt])  // Frequent queries
   @@index([createdAt])                   // Pagination/sorting
   @@unique([email])                      // Business rule
   ```

4. **Versioning for Cache**: `version` field
   - Increment on updates
   - Cache key: `user:{id}:v{version}`
   - Automatic invalidation

---

## Security Model

### Authentication Flow
```
1. User sends email + password
2. Service validates credentials
3. Generate JWT (access token + refresh token)
4. Return tokens to client
5. Client includes in future requests: Authorization: Bearer <token>
6. JwtAuthGuard validates on each request
```

### Authorization Layers
```
1. JwtAuthGuard: Is user authenticated?
2. PermissionsGuard: Does user have specific permission?
3. RoleGuard: Does user have specific role?
4. AclGuard: Does user have access to specific resource?

@RequirePermissions([Permissions.BOOKING.CREATE])
@RequireRoles([SystemRole.USER])
@UseGuards(JwtAuthGuard, AclGuard)
async create(...) {}
```

### Sensitive Data Protection
- ✅ Passwords: Argon2 hashing
- ✅ API Keys: Hashed in database
- ✅ Tokens: JWT (short-lived access, long-lived refresh)
- ✅ User Data: Excluded from responses (use DTOs)
- ✅ Audit: All actions logged

### Rate Limiting
```
Per-user: 120 requests/minute
Per-IP: 1000 requests/minute
Per-workspace: Custom limits

Configurable via:
@RateLimit({
  keyBy: 'user',
  refillPerSec: 2,      // 120/minute
  capacity: 120,
})
```

---

## API Response Standards

### Success Response
```json
{
  "ok": true,
  "data": {
    "id": "...",
    "title": "...",
    "status": "DRAFT"
  },
  "path": "/api/bookings",
  "timestamp": "2025-10-28T10:30:00Z"
}
```

### Error Response
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "email": "Must be valid email format"
    }
  },
  "path": "/api/users",
  "timestamp": "2025-10-28T10:30:00Z"
}
```

### Paginated Response
```json
{
  "ok": true,
  "data": [
    { "id": "...", "title": "..." },
    { "id": "...", "title": "..." }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  },
  "path": "/api/bookings?page=1&limit=10",
  "timestamp": "2025-10-28T10:30:00Z"
}
```

---

## Common Tasks

### Add New Module
```bash
nest g module modules/new-feature
nest g service modules/new-feature
nest g controller modules/new-feature
```

Then update `app.module.ts` imports.

### Create Database Migration
```bash
npx prisma migrate dev --name feature_name
```

### Add New Permission
```typescript
// src/modules/rbac/constants/index.ts
export const Permissions = {
  FEATURE: {
    CREATE: 'feature.create',
    READ: 'feature.read',
    UPDATE: 'feature.update',
    DELETE: 'feature.delete',
  }
}

// Assign to role in database or seed
```

### Run Tests
```bash
npm test                    # All tests
npm run test:watch        # Watch mode
npm run test:cov          # Coverage
npm run test:e2e          # E2E tests
```

### Build & Run
```bash
npm run build             # SWC compilation
npm run start:prod        # Production
npm run start:dev         # Development
npm run dev              # Watch + type checking
```

---

## Next Steps

See `PROJECT_ARCHITECTURE_REVIEW.md` for:
- Detailed improvement roadmap
- Specific code patterns
- Implementation examples
- Performance considerations

---

**Last Updated**: October 28, 2025  
**Maintainers**: Development Team
