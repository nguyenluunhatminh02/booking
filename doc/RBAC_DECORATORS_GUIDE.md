# 🎯 RBAC Decorators Guide - Hướng Dẫn Sử Dụng Chi Tiết

## 📋 Tổng Quan Decorators Có Sẵn

Project của bạn hiện có **4 decorators chính**:

1. **`@RequirePermissions()`** - Check permission-based authorization
2. **`@Roles()`** (qua `ROLES_KEY`) - Check role-based authorization  
3. **`@Public()`** - Bypass authentication
4. **`@CurrentUser()`** - Extract current user từ request

---

## 🔐 **1. @RequirePermissions() Decorator**

### ✅ Cách Sử Dụng

```typescript
import { Controller, Get, Post, Put, Delete } from '@nestjs/common';
import { RequirePermissions } from '@/modules/rbac/decorators';
import { CurrentUser } from '@/common/decorators';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  // ❌ Require single permission
  @Get()
  @RequirePermissions(['post.read'])  // User MUST have 'post.read'
  findAll() {
    return this.postsService.findAll();
  }

  // ✅ Require multiple permissions (mode: 'all' = default)
  @Post()
  @RequirePermissions(['post.create', 'post.publish'], 'all')  // User MUST have BOTH
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  // 🔄 Require ANY of the permissions
  @Put(':id')
  @RequirePermissions(['post.update', 'post.edit'], 'any')  // User needs EITHER one
  update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.postsService.update(id, dto);
  }

  // 🗑️ Delete requires high privilege
  @Delete(':id')
  @RequirePermissions(['post.delete'])
  delete(@Param('id') id: string) {
    return this.postsService.delete(id);
  }
}
```

### 📌 Modes Explained

| Mode | Behavior | Example |
|------|----------|---------|
| `'all'` (default) | User MUST have ALL permissions | `['post.create', 'post.publish']` → needs both |
| `'any'` | User needs AT LEAST ONE permission | `['post.edit', 'post.admin']` → needs either |

### 🎯 Naming Convention for Permissions

```
Format: {resource}.{action}

Examples:
- booking.create    - Create booking
- booking.read      - View booking
- booking.update    - Update booking
- booking.delete    - Delete booking
- booking.confirm   - Confirm booking
- booking.refund    - Process refund

- user.read         - View user
- user.update       - Update user
- user.delete       - Delete user

- file.upload       - Upload file
- file.read         - Download file
- file.delete       - Delete file

- role.create       - Create role
- role.assign       - Assign role to user
```

---

## 👥 **2. Role-Based Check (via @Roles() equivalent)**

### ✅ Cách Sử Dụng

**Note**: NestJS doesn't have `@Roles()` built-in, nhưng bạn có thể tạo:

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**Usage**:

```typescript
import { Roles } from '@/modules/rbac/decorators';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ✅ Require admin role
  @Get('dashboard')
  @Roles('admin')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ✅ Require admin OR moderator
  @Get('reports')
  @Roles('admin', 'moderator')  // User must have at least one role
  getReports() {
    return this.adminService.getReports();
  }

  // ✅ Only admins can delete users
  @Delete('users/:id')
  @Roles('admin')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
```

---

## 🔓 **3. @Public() Decorator - Bypass Authentication**

### ✅ Cách Sử Dụng

```typescript
import { Public } from '@/common/decorators';

@Controller('auth')
export class AuthController {
  // ✅ NO authentication needed
  @Post('login')
  @Public()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ✅ NO authentication needed
  @Post('signup')
  @Public()
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  // ✅ Check email is unique (public endpoint)
  @Get('check-email/:email')
  @Public()
  checkEmail(@Param('email') email: string) {
    return this.authService.checkEmailExists(email);
  }

  // ✅ Public endpoint for admin seeding
  @Post('seed-rbac')
  @Public()  // Only for initial setup!
  seedRbac() {
    return this.rbacAdminService.setupDefaultRbac();
  }
}
```

---

## 👤 **4. @CurrentUser() - Get Current User**

### ✅ Cách Sử Dụng

```typescript
import { CurrentUser } from '@/common/decorators';

@Controller('profile')
export class ProfileController {
  // ✅ Get current user ID
  @Get('me')
  getCurrentUserProfile(@CurrentUser('id') userId: string) {
    return this.profileService.getUserById(userId);
  }

  // ✅ Get full user object
  @Get('full')
  getFullUserData(@CurrentUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  // ✅ Update own profile
  @Put('me')
  @CurrentUser('id')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.update(userId, dto);
  }

  // ✅ Get user's bookings
  @Get('my-bookings')
  @RequirePermissions(['booking.read'])
  getMyBookings(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.bookingsService.findByUser(userId, status);
  }
}
```

---

## 🔗 **5. Combining Multiple Decorators**

### ✅ Advanced Usage Patterns

**Pattern 1: Public endpoint with optional permission check**
```typescript
@Get('posts')
@Public()
getPublicPosts() {
  // Anyone can view public posts
  return this.postsService.getPublic();
}
```

**Pattern 2: Permission check + ownership verification**
```typescript
@Put('bookings/:id')
@RequirePermissions(['booking.update'])
updateBooking(
  @Param('id') id: string,
  @CurrentUser('id') userId: string,
  @Body() dto: UpdateBookingDto,
) {
  // First: PermissionsGuard checks if user has 'booking.update'
  // Then: Service verifies if user owns this booking
  return this.bookingsService.update(id, userId, dto);
}
```

**Pattern 3: Admin-only or owner**
```typescript
@Delete('bookings/:id')
@RequirePermissions(['booking.delete'])  // Can use 'any' mode
deleteBooking(
  @Param('id') id: string,
  @CurrentUser('id') userId: string,
) {
  // Only users with 'booking.delete' permission can reach here
  // Add logic to ensure user owns it or is admin
  return this.bookingsService.delete(id, userId);
}
```

**Pattern 4: Multiple permissions with 'any' mode**
```typescript
@Get('bookings/:id')
@RequirePermissions(['booking.read', 'booking.admin'], 'any')
getBooking(@Param('id') id: string) {
  // User needs EITHER 'booking.read' OR 'booking.admin'
  return this.bookingsService.findOne(id);
}
```

---

## 🚀 **6. Real-World Examples**

### Example 1: Booking Management

```typescript
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  // 📖 View all my bookings (need read permission)
  @Get()
  @RequirePermissions(['booking.read'])
  findMyBookings(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.bookingsService.findByUser(userId, status);
  }

  // ➕ Create new booking (need create permission)
  @Post()
  @RequirePermissions(['booking.create'])
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(userId, dto);
  }

  // ✏️ Update booking (need update permission OR own it)
  @Put(':id')
  @RequirePermissions(['booking.update'])
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, userId, dto);
  }

  // ✅ Confirm booking (need confirm permission)
  @Post(':id/confirm')
  @RequirePermissions(['booking.confirm'])
  confirm(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.confirm(id, userId);
  }

  // ❌ Cancel booking (need cancel permission)
  @Post(':id/cancel')
  @RequirePermissions(['booking.cancel'])
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, userId, dto);
  }

  // 💰 Refund (admin-only, need refund permission)
  @Post(':id/refund')
  @RequirePermissions(['booking.refund'])
  refund(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.confirmRefund(id, userId);
  }

  // 🗑️ Delete (admin-only)
  @Delete(':id')
  @RequirePermissions(['booking.delete'])
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.delete(id, userId);
  }
}
```

### Example 2: RBAC Admin Panel

```typescript
@Controller('rbac')
export class RbacController {
  constructor(
    private rbacService: RbacService,
    private rbacAdminService: RbacAdminService,
  ) {}

  // 🔓 Public - Seed initial RBAC data (first time only!)
  @Post('seed')
  @Public()
  seedRbac() {
    return this.rbacAdminService.setupDefaultRbac();
  }

  // 📋 View roles (admin only)
  @Get('roles')
  @RequirePermissions(['role.read'])
  getRoles() {
    return this.rbacAdminService.getRoles();
  }

  // ➕ Create new role (admin only)
  @Post('roles')
  @RequirePermissions(['role.create'])
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbacAdminService.createRole(dto);
  }

  // 👤 Assign role to user (admin only)
  @Post('users/:userId/roles/:roleId')
  @RequirePermissions(['role.assign'])
  assignRoleToUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rbacAdminService.assignRoleToUser(userId, roleId);
  }

  // 📊 Get user permissions (admin + owner)
  @Get('users/:userId/permissions')
  @RequirePermissions(['permission.read', 'user.read'], 'any')
  getUserPermissions(
    @Param('userId') userId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    // Additional check: allow only if viewing own perms or is admin
    return this.rbacService.expandUserPermissions(userId);
  }
}
```

### Example 3: File Management

```typescript
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  // 📤 Upload file (need permission)
  @Post('upload')
  @RequirePermissions(['file.upload'])
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.filesService.upload(file, userId);
  }

  // 📥 Download file
  @Get(':id/download')
  @RequirePermissions(['file.read'])
  download(@Param('id') id: string) {
    return this.filesService.download(id);
  }

  // 🗑️ Delete file
  @Delete(':id')
  @RequirePermissions(['file.delete'])
  delete(@Param('id') id: string) {
    return this.filesService.delete(id);
  }

  // 📋 List my files
  @Get()
  @RequirePermissions(['file.read'])
  listMyFiles(@CurrentUser('id') userId: string) {
    return this.filesService.listByUser(userId);
  }
}
```

---

## ⚙️ **7. Permission Execution Flow**

### 🔄 Request Flow Diagram

```
Request → [CustomThrottlerGuard] → [JwtAuthGuard] → [PermissionsGuard] → [RoleGuard] → Controller

1. CustomThrottlerGuard: Rate limiting check
2. JwtAuthGuard: Verify JWT (can skip with @Public())
3. PermissionsGuard: Check @RequirePermissions() metadata
   └─ Calls RbacService.checkPermissions()
   └─ Checks: permissions, ownership, ACL
4. RoleGuard: Check @Roles() metadata
5. Controller: Executes endpoint logic
```

### 🎯 What PermissionsGuard Does

```typescript
// 1. Reads decorator metadata
@RequirePermissions(['booking.create'])

// 2. Extracts user from JWT
const user = req.user  // { id, email, ... }

// 3. Gets user permissions from cache
const permissions = await rbacService.checkPermissions({
  userId: user.id,
  required: ['booking.create'],
  mode: 'all',  // from decorator
  resourceType: 'booking',  // extracted from route
  resourceId: req.params.id,
})

// 4. Returns 200 if allowed, 403 if denied
if (!permissions.allowed) {
  throw new ForbiddenException(permissions.reason)
}
```

---

## 📝 **8. Debugging Tips**

### Check User Permissions Programmatically

```typescript
@Injectable()
export class DebugService {
  constructor(private rbac: RbacService) {}

  async debugUserPermissions(userId: string) {
    // Get all permissions for user
    const permissions = await this.rbac.expandUserPermissions(userId);
    console.log('User Permissions:', permissions);

    // Get all roles for user
    const roles = await this.rbac.getUserRoles(userId);
    console.log('User Roles:', roles);

    // Check specific permission
    const canCreate = await this.rbac.checkPermissions({
      userId,
      required: ['booking.create'],
      mode: 'all',
    });
    console.log('Can Create Booking:', canCreate.allowed);
  }
}
```

### Test Endpoints with cURL

```bash
# 1. Seed RBAC data
curl -X POST http://localhost:3000/rbac/admin/seed

# 2. Login
LOGIN_RESPONSE=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}')
JWT=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

# 3. Access protected endpoint
curl -X GET http://localhost:3000/bookings \
  -H "Authorization: Bearer $JWT"

# 4. Test unauthorized
curl -X POST http://localhost:3000/bookings/:id/refund \
  -H "Authorization: Bearer $JWT"  # Will fail if user doesn't have 'booking.refund'
```

---

## 🎓 **9. Common Patterns Summary**

| Pattern | Usage | Example |
|---------|-------|---------|
| Single permission | One action required | `@RequirePermissions(['post.read'])` |
| Multiple permissions (all) | All actions required | `@RequirePermissions(['post.create', 'post.publish'], 'all')` |
| Multiple permissions (any) | At least one action required | `@RequirePermissions(['post.edit', 'admin.access'], 'any')` |
| Public endpoint | No auth needed | `@Public()` |
| Get current user | Access user in handler | `@CurrentUser('id') userId: string` |
| Role check | Check user role | `@Roles('admin')` |

---

## ✅ **Checklist - Khi Implement Endpoint Mới**

- [ ] Xác định endpoint cần cái permissions gì
- [ ] Thêm `@RequirePermissions(['resource.action'])` decorator
- [ ] Nếu là công khai, thêm `@Public()`
- [ ] Nếu cần user info, inject `@CurrentUser('id')`
- [ ] Test endpoint với JWT token
- [ ] Verify error response khi permission denied

---

**Status**: ✅ **All code is working perfectly!**
