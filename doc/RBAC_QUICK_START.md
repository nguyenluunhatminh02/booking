### RBAC Decorators Quick Reference

## 🔐 Decorators Có Sẵn

### 1. @RequirePermissions([...], 'all' | 'any')
**Check permission-based authorization**

```typescript
import { RequirePermissions } from '@/modules/rbac/decorators';

@Get()
@RequirePermissions(['booking.read'])
findAll() { }

@Post()
@RequirePermissions(['booking.create', 'booking.publish'], 'all')
create() { }

@Delete()
@RequirePermissions(['booking.delete', 'admin.access'], 'any')
delete() { }
```

---

### 2. @Roles(...roles)
**Check role-based authorization**

```typescript
import { Roles } from '@/modules/rbac/decorators';

@Get('admin')
@Roles('admin')
getDashboard() { }

@Post('manage')
@Roles('admin', 'moderator')  // Need at least one role
manage() { }
```

---

### 3. @Public()
**Bypass JWT authentication**

```typescript
import { Public } from '@/common/decorators';

@Post('login')
@Public()
login() { }

@Post('signup')
@Public()
signup() { }
```

---

### 4. @CurrentUser(key?)
**Get current authenticated user**

```typescript
import { CurrentUser } from '@/common/decorators';

// Get user ID only
@Get('me')
getProfile(@CurrentUser('id') userId: string) { }

// Get full user object
@Get('profile')
getFullProfile(@CurrentUser() user: any) { }

// With permissions
@Put('me')
@RequirePermissions(['user.update'])
updateProfile(
  @CurrentUser('id') userId: string,
  @Body() dto: UpdateProfileDto
) { }
```

---

## 📋 Permission Naming Convention

**Format**: `{resource}.{action}`

### Common Permissions

**Bookings**
- `booking.read` - View bookings
- `booking.create` - Create booking
- `booking.update` - Update booking
- `booking.delete` - Delete booking
- `booking.confirm` - Confirm booking
- `booking.cancel` - Cancel booking
- `booking.refund` - Process refund

**Users**
- `user.read` - View user
- `user.create` - Create user
- `user.update` - Update user
- `user.delete` - Delete user

**Files**
- `file.read` - Download file
- `file.upload` - Upload file
- `file.delete` - Delete file

**RBAC**
- `role.read` - View roles
- `role.create` - Create role
- `role.update` - Update role
- `role.assign` - Assign role to user
- `permission.read` - View permissions

---

## 🧪 Test API Endpoints

### 1. Seed RBAC Data (First Time Only)
```bash
curl -X POST http://localhost:3000/rbac/admin/seed
```

**Response**:
```json
{
  "success": true,
  "message": "Default RBAC setup complete"
}
```

---

### 2. Login (Get JWT Token)
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": {
      "id": "user123",
      "email": "admin@example.com",
      "firstName": "Admin",
      "role": "ADMIN"
    }
  }
}
```

---

### 3. Access Protected Endpoint (With Permission)
```bash
JWT="your-token-here"

# ✅ This will succeed (user has 'booking.read')
curl -X GET http://localhost:3000/bookings \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json"
```

**Response** (Success):
```json
{
  "success": true,
  "data": [
    {
      "id": "booking123",
      "status": "PENDING",
      "userId": "user123",
      "createdAt": "2024-10-24T10:00:00Z"
    }
  ]
}
```

---

### 4. Access Endpoint Without Permission
```bash
JWT="user-token-here"  # User token (not admin)

# ❌ This will fail (user lacks 'booking.refund')
curl -X POST http://localhost:3000/bookings/booking123/refund \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json"
```

**Response** (Error):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Missing: booking.refund",
    "statusCode": 403,
    "timestamp": "2024-10-24T10:05:00.000Z",
    "path": "/bookings/booking123/refund",
    "requestId": "req-abc123"
  }
}
```

---

### 5. Access Public Endpoint (No JWT)
```bash
# ✅ No authorization header needed
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

---

## 🔍 Available Default Roles

After seeding, these roles are created:

| Role | Permissions | Use Case |
|------|-------------|----------|
| `admin` | All 21 permissions | Full system access |
| `moderator` | Read, update, cancel, delete files | Content management |
| `user` | Read, create, update, upload | Regular user |

---

## 🛠️ Implementation Checklist

When creating a new endpoint:

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { RequirePermissions, Roles } from '@/modules/rbac/decorators';
import { Public } from '@/common/decorators';
import { CurrentUser } from '@/common/decorators';

@Controller('my-resource')
export class MyResourceController {
  
  // ✅ Public endpoint (no auth)
  @Get('public')
  @Public()
  publicEndpoint() {
    // Anyone can access
  }

  // ✅ Check permission only
  @Get()
  @RequirePermissions(['my-resource.read'])
  getAll() {
    // Only users with 'my-resource.read'
  }

  // ✅ Check role only
  @Post('admin')
  @Roles('admin')
  adminOnly() {
    // Only admins can access
  }

  // ✅ Check permission AND get current user
  @Post()
  @RequirePermissions(['my-resource.create'])
  create(
    @Body() dto: CreateDto,
    @CurrentUser('id') userId: string
  ) {
    // User has permission and we know their ID
  }

  // ✅ Multiple decorators
  @Delete(':id')
  @RequirePermissions(['my-resource.delete'])
  @Roles('admin')  // Optional: also check role
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    // Must be admin AND have delete permission
  }
}
```

---

## 🧠 Guard Execution Order

```
Incoming Request
    ↓
[1] CustomThrottlerGuard (Rate limiting)
    ↓
[2] JwtAuthGuard (Authentication - skip if @Public())
    ↓
[3] PermissionsGuard (@RequirePermissions check)
    ↓
[4] RoleGuard (@Roles check)
    ↓
Controller Handler
    ↓
Response
```

---

## 💡 Real Examples

### User Self-Update (Permission + Ownership)
```typescript
@Put('users/:id')
@RequirePermissions(['user.update'])
updateUser(
  @Param('id') targetUserId: string,
  @CurrentUser('id') currentUserId: string,
  @Body() dto: UpdateUserDto
) {
  // Guard checks: user has 'user.update' permission
  // Service checks: user updates own profile OR is admin
  if (targetUserId !== currentUserId && !userIsAdmin) {
    throw new ForbiddenException('Can only update own profile');
  }
  return this.userService.update(targetUserId, dto);
}
```

### Complex Permission Check
```typescript
@Post('bookings/:id/refund')
@RequirePermissions(
  ['booking.refund', 'booking.admin'],  // Admin OR specific refund permission
  'any'
)
refundBooking(
  @Param('id') bookingId: string,
  @CurrentUser('id') userId: string,
  @Body() dto: RefundDto
) {
  return this.bookingService.refund(bookingId, userId, dto);
}
```

---

**All decorators are production-ready! ✅**
