# 🔍 CODE GAP ANALYSIS

**Purpose:** So sánh code từ prompt với project hiện tại để xác định điều cần implement

---

## ❌ MISSING SERVICES (Not in Project)

### 1. **RedisService** 🔴 CRITICAL
**Location:** `src/common/services/redis.service.ts`  
**Status:** ❌ NOT FOUND in project  
**From Prompt:** Complete implementation với:
- Connection pooling (ioredis)
- Health check (ping)
- Lua script support (scriptLoad, evalsha)
- Distributed lock (acquireLock, releaseLock)
- JSON helpers (setJSON, getJSON)
- Key prefix support

**Current State:**
```typescript
// Project chỉ có TokenBucketService nhưng không có RedisService cơ bản
// TokenBucketService inject RedisService (MISSING DEPENDENCY)
```

**Action:** 🔴 MUST CREATE từ code prompt

---

### 2. **RbacService** 🔴 CRITICAL
**Location:** `src/modules/rbac/rbac.service.ts`  
**Status:** ❌ NOT FOUND (only RolesService, PermissionsService exist)  
**From Prompt:** Core RBAC logic:
- `expandUserPermissions(userId, scopeKey)` - Get all permissions with cache
- `checkPermissions(userId, needed[], resource?)` - Check multi-permission
- `applyOwnershipBoost()` - Owner gets auto `manage` permission
- `applyAcl()` - Apply DENY overrides from ResourceACL
- `match()` - Wildcard matching: `user:*`, `*:read`, `manage:*`

**Current State:**
```typescript
// rbac.module.ts
providers: [RolesService, PermissionsService] // ⬅️ Missing RbacService
```

**Action:** 🔴 MUST CREATE - This is THE core permission engine

---

### 3. **RbacCacheService** 🔴 CRITICAL
**Location:** `src/modules/rbac/rbac-cache.service.ts`  
**Status:** ❌ NOT FOUND  
**From Prompt:** Cache layer cho RBAC:
- User version tracking (`getVersion()`, `bumpUser()`)
- Role version tracking (`getRoleVersion()`, `bumpRole()`)
- Stamp-based cache keys: `user:${userId}:${scope}:${stamp}`
- Dual storage: Redis (production) + in-memory (fallback)

**Why Critical:**
- Without cache, every permission check hits DB (N queries per request)
- With cache: 1 cache hit vs 10+ DB queries
- Performance impact: 10x slower without cache

**Action:** 🔴 MUST CREATE

---

### 4. **RbacAdminService** 🟡 IMPORTANT
**Location:** `src/modules/rbac/rbac-admin.service.ts`  
**Status:** ❌ NOT FOUND  
**From Prompt:** Admin operations:
- `addRoleToUser()`, `removeRoleFromUser()`
- `addPermissionToRole()`, `removePermissionFromRole()`
- `grantAcl()`, `revokeAcl()`
- Auto cache invalidation after mutations

**Current State:**
```typescript
// RolesController có methods nhưng không có dedicated service
// Logic scattered trong controller (bad practice)
```

**Action:** 🟡 SHOULD CREATE cho clean architecture

---

### 5. **TokenBucketService** 🟡 PARTIAL EXISTS
**Location:** `src/core/rate-limit/token-bucket.service.ts`  
**Status:** ⚠️ EXISTS but may need updates  
**From Prompt:** Lua script-based rate limiting

**Need to Verify:**
- [ ] Lua script loaded correctly
- [ ] Integrates với RedisService
- [ ] Handles Redis unavailable (fallback)
- [ ] Returns correct decision structure

---

### 6. **TokenStateService** 🟡 IMPORTANT
**Location:** `src/modules/auth/token-state.service.ts`  
**Status:** ❌ NOT FOUND  
**From Prompt:** Advanced token management:
- Access version (invalidate all tokens of user)
- Session version (invalidate per session)
- JTI denylist (revoke single token)
- User lock (temporarily block user)

**Current State:**
```typescript
// AuthService có basic JWT logic
// Missing: version tracking, denylist, lock
```

**Action:** 🟡 ADD for production security

---

### 7. **DeviceFingerprintService** 🟡 IMPORTANT
**Location:** `src/common/services/device-fingerprint.service.ts`  
**Status:** ❌ NOT FOUND  
**From Prompt:**
- Cookie-based deviceId (UUID)
- HMAC fingerprint: UA + platform + lang + IP/24
- `getOrSetDeviceId()`, `calcSignature()`, `verifySignature()`

**Action:** 🟡 ADD for device-based security

---

### 8. **DeviceApprovalService** 🟢 NICE TO HAVE
**Location:** `src/modules/auth/device-approval.service.ts`  
**Status:** ❌ NOT FOUND  
**From Prompt:**
- Issue approval token when new device detected
- Send magic link via SendGrid
- `approve()` - verify + update session.approved = true

**Action:** 🟢 ADD later for advanced security

---

### 9. **CacheService** 🟢 NICE TO HAVE
**Location:** `src/common/services/cache.service.ts`  
**Status:** ❌ NOT FOUND  
**From Prompt:** Multi-layer cache (L1: memory, L2: Redis)

**Action:** 🟢 ADD for performance boost (optional)

---

## ❌ MISSING GUARDS

### 1. **PermissionsGuard** 🔴 CRITICAL
**Location:** `src/modules/rbac/guards/permissions.guard.ts`  
**Status:** ❌ NOT FOUND  
**From Prompt:**
```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  // Read @RequirePermissions() metadata
  // Call RbacService.checkPermissions()
  // Support mode: 'all' | 'any'
  // Extract resourceId from params/query/body
}
```

**Current State:**
```typescript
// Project có JwtAuthGuard, CustomThrottlerGuard
// Missing: PermissionsGuard (RBAC không work!)
```

**Action:** 🔴 MUST CREATE - Guards are entry point

---

### 2. **RoleGuard** 🟡 IMPORTANT
**Location:** `src/modules/rbac/guards/role.guard.ts`  
**Status:** ❌ NOT FOUND  
**From Prompt:**
```typescript
// Check @RequireRole() và @RequireAnyRole()
// Query UserRole table
```

**Action:** 🟡 SHOULD CREATE

---

### 3. **RateLimitGuard** 🟡 IMPORTANT
**Location:** `src/common/guards/rate-limit.guard.ts`  
**Status:** ❌ NOT FOUND (có CustomThrottlerGuard khác)  
**From Prompt:**
- Read `@RateLimit()` decorator
- Call `TokenBucketService.consume()`
- Set headers: `RateLimit-Limit`, `RateLimit-Remaining`, `Retry-After`

**Current State:**
```typescript
// Có CustomThrottlerGuard (NestJS throttler module)
// Missing: Custom token bucket rate limit guard
```

**Action:** 🟡 ADD nếu cần granular control

---

## ❌ MISSING MIDDLEWARES

### Status Summary
| Middleware | Status | Priority |
|-----------|--------|----------|
| RequestIdMiddleware | ✅ EXISTS | - |
| LoggingMiddleware | ❌ NOT FOUND | 🟡 |
| DeviceFingerprintMiddleware | ❌ NOT FOUND | 🟡 |
| RequestContextMiddleware | ❌ NOT FOUND | 🟡 |
| AnonIdMiddleware | ❌ NOT FOUND | 🟢 |
| XssMiddleware | ❌ NOT FOUND | 🟠 |
| CsrfMiddleware | ❌ NOT FOUND | 🟠 |

**All middlewares have complete code in prompt - just need to create files**

---

## ❌ MISSING DECORATORS

### 1. **Permission Decorators** 🔴 CRITICAL
```typescript
// src/modules/rbac/decorators/permissions.decorator.ts
@RequirePermissions(...perms)      // ❌ NOT FOUND
@RequireAnyPermissions(...perms)   // ❌ NOT FOUND
@Resource(type, idSelector)        // ❌ NOT FOUND
```

**Current State:**
```typescript
// Project chỉ có @Public(), @CurrentUser()
// Missing: RBAC decorators
```

---

### 2. **Role Decorators** 🟡 IMPORTANT
```typescript
// src/modules/rbac/decorators/role.decorator.ts
@RequireRole(roleName)       // ❌ NOT FOUND
@RequireAnyRole(...roles)    // ❌ NOT FOUND
```

---

### 3. **Rate Limit Decorator** 🟡 IMPORTANT
```typescript
// src/common/decorators/rate-limit.decorator.ts
@RateLimit({ capacity, refillTokens, refillIntervalMs, keyBy })
```

**Status:** ❌ Code có trong prompt, chưa trong project

---

### 4. **Validation Decorators** 🟢 NICE TO HAVE
```typescript
// src/common/validators/
@IsStrongPassword()    // ❌ NOT FOUND
@XssSanitize()         // ❌ NOT FOUND
```

---

## ❌ MISSING FILTERS

### **GlobalExceptionFilter** 🔴 IMPORTANT
**Location:** `src/common/filters/global-exception.filter.ts`  
**Status:** ⚠️ Project có nhiều filters (AllExceptionsFilter, HttpExceptionFilter, PrismaClientExceptionFilter)  
**From Prompt:** Unified error handling:
- Map all exceptions → structured ErrorResponse
- Log với appropriate level
- Capture to Sentry (5xx only)
- Redact sensitive data

**Current Issue:**
```typescript
// main.ts - TOO MANY FILTERS
app.useGlobalFilters(
  new PrismaClientExceptionFilter(),
  new TooManyRequestsFilter(),
  new HttpExceptionFilter(),
  new AllExceptionsFilter(), // ⬅️ Should be ONE unified filter
);
```

**Action:** 🔴 REFACTOR - Replace với GlobalExceptionFilter từ prompt

---

## ❌ MISSING ERROR CLASSES

### **AppException Hierarchy** 🔴 IMPORTANT
**Location:** `src/common/errors/app.exception.ts`  
**Status:** ❌ NOT FOUND  
**From Prompt:**
```typescript
export class AppException extends HttpException {
  constructor(public readonly problem: ProblemDetail) {}
}

export const to400 = (detail, fieldErrors?) => new AppException({...});
export const to401 = (detail) => new AppException({...});
export const to403 = (detail) => new AppException({...});
export const to404 = (detail) => new AppException({...});
export const to409 = (detail) => new AppException({...});
export const to429 = (decision) => new AppException({...});
```

**Current State:**
```typescript
// Project throw generic exceptions
throw new BadRequestException('Invalid input');
// Should be:
throw to400('Invalid email format', { email: 'Must be valid email' });
```

**Action:** 🔴 CREATE - Standardize error responses

---

## ❌ MISSING UTILITIES

### 1. **Token Utilities** 🟡 IMPORTANT
```typescript
// src/modules/auth/refresh-token.util.ts
splitRefreshToken()      // ❌ NOT FOUND
buildRefreshToken()      // ❌ NOT FOUND
parseDurationToSec()     // ❌ NOT FOUND
```

### 2. **Crypto Utilities** 🟡 IMPORTANT
```typescript
// src/modules/auth/crypto.util.ts
hashPassword()           // ⚠️ May exist in AuthService
verifyPassword()         // ⚠️ May exist in AuthService
hashRefreshPart()        // ❌ NOT FOUND
verifyRefreshPart()      // ❌ NOT FOUND
```

### 3. **Permission Utilities** 🟡 IMPORTANT
```typescript
// src/modules/rbac/perms.ts
normSub(), normAct()     // ❌ NOT FOUND
permKey()                // ❌ NOT FOUND
asDbSubject()            // ❌ NOT FOUND
asDbAction()             // ❌ NOT FOUND
```

---

## ⚠️ INCOMPLETE IMPLEMENTATIONS

### 1. **BookingsService** ⚠️ PARTIAL
**Issue:** Enum usage fixed, nhưng thiếu methods:
- ❌ `expireHolds()` - auto-expire PENDING bookings
- ❌ State machine validation could be stronger

### 2. **OutboxEventService** ⚠️ PARTIAL
**Check:**
- [ ] Có batch processing không?
- [ ] Có retry logic không?
- [ ] Có dead letter queue không?

### 3. **AuthService** ⚠️ PARTIAL
**Missing:**
- ❌ Device fingerprint check trong `refreshTokens()`
- ❌ Session version check
- ❌ Access version check
- ❌ JTI denylist check

---

## 🔧 CONFIGURATION GAPS

### Missing Config Files
```
❌ src/config/csrf.config.ts
❌ src/config/rate-limit.config.ts
❌ src/config/auth.config.ts (cookie options, etc.)
```

### Missing Environment Variables
```env
# Missing from .env.example:
CSRF_SECRET=
DEVICE_APPROVAL_TTL_SEC=900
FP_SECRET=
DEVICE_COOKIE_NAME=dvc
REDIS_PREFIX=booking:
BCRYPT_ROUNDS=12
API_ORIGIN=http://localhost:3000
```

---

## 📊 PRIORITY MATRIX

### 🔴 P0 - MUST IMPLEMENT NOW (2-3 days)
1. **RedisService** - Foundation for everything
2. **RbacService** - Core permission engine
3. **RbacCacheService** - Performance critical
4. **PermissionsGuard** - Guards don't work without this
5. **GlobalExceptionFilter** - Error handling mess

### 🟡 P1 - SHOULD IMPLEMENT SOON (1-2 days)
6. **RbacAdminService** - Clean admin operations
7. **RoleGuard** - Role-based restrictions
8. **TokenStateService** - Advanced token security
9. **DeviceFingerprintService** - Security layer
10. **Middlewares** (Logging, XSS, CSRF, RequestContext)

### 🟢 P2 - NICE TO HAVE (Optional)
11. **DeviceApprovalService** - Advanced device approval
12. **CacheService** - Multi-layer caching
13. **Custom validators** (@IsStrongPassword, @XssSanitize)
14. **Utilities** (token, crypto, permission helpers)

---

## 🎯 RECOMMENDED ACTION PLAN

### Week 1: Critical Path
```
Day 1-2: RedisService + RbacService + RbacCacheService
Day 3:   PermissionsGuard + RoleGuard + Decorators
Day 4:   RbacAdminService + Update controllers
Day 5:   GlobalExceptionFilter + AppException + Test
```

### Week 2: Security & Polish
```
Day 1:   TokenStateService + DeviceFingerprintService
Day 2:   Middlewares (Logging, XSS, CSRF)
Day 3:   RateLimitGuard + Monitoring
Day 4:   Database indexes + Query optimization
Day 5:   Load testing + Bug fixes
```

---

## ✅ VALIDATION CHECKLIST

### Before Marking Complete
- [ ] Server starts without errors
- [ ] All guards registered in AppModule
- [ ] RBAC flow tested: seed permissions → assign role → check permission → 200/403
- [ ] Cache working: Redis connected, permissions cached
- [ ] Rate limiting working: burst → 429
- [ ] Error responses structured: code + message + meta
- [ ] Logs structured: JSON with requestId, userId
- [ ] Security middlewares active: XSS blocked, CSRF required
- [ ] Health check passes: /health returns 200
- [ ] Unit tests pass: coverage > 80%

---

## 💡 KEY INSIGHTS

### Why So Much Missing?
Code từ prompt là **complete enterprise solution** với:
- Advanced RBAC với caching + versioning
- Device fingerprinting + approval flow
- Token bucket rate limiting với Lua scripts
- Multi-layer error handling
- Comprehensive middleware stack

Project hiện tại có **solid foundation** nhưng thiếu:
- Core RBAC engine (only has tables, not logic)
- Redis integration (mentioned but not implemented)
- Advanced auth features (device approval, session management)
- Production-grade error handling

### Recommended Approach
1. **Don't rush** - Implement P0 items first, test thoroughly
2. **Incremental** - Add one service at a time, validate
3. **Test-driven** - Write tests as you go
4. **Document** - Update README with new features

---

**Next Step:** Start với `RedisService` + `RbacService` - everything else builds on these 🚀
