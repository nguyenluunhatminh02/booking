# 📚 API COMPLETE REFERENCE - BOOKING SYSTEM

> **Document đầy đủ tất cả API endpoints với Request/Response body chi tiết**  
> Cập nhật: 28/10/2025

---

## 📖 MỤC LỤC

1. [Authentication APIs](#1-authentication-apis)
2. [User Management APIs](#2-user-management-apis)
3. [Property Management APIs](#3-property-management-apis)
4. [Booking Management APIs](#4-booking-management-apis)
5. [Review APIs](#5-review-apis)
6. [File Upload APIs](#6-file-upload-apis)
7. [Invoice APIs](#7-invoice-apis)
8. [RBAC APIs](#8-rbac-apis)
9. [ACL APIs](#9-acl-apis)
10. [Notifications APIs](#10-notifications-apis)
11. [Search APIs](#11-search-apis)
12. [Common Response Format](#12-common-response-format)

---

## 1. AUTHENTICATION APIs

### 1.1 POST /auth/login
**Mô tả:** Đăng nhập với email và password  
**Public:** ✅ Yes  
**Rate Limit:** Token bucket (5 requests, refill 0.5/sec)

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid-v4",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "emailVerified": true
    }
  }
}
```

#### Response Error (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Email hoặc mật khẩu không chính xác"
  },
  "timestamp": "2025-10-28T10:00:00.000Z"
}
```

---

### 1.2 POST /auth/register
**Mô tả:** Đăng ký tài khoản mới (gửi email xác thực)  
**Public:** ✅ Yes

#### Request Body (Option 1: Full name)
```json
{
  "email": "newuser@example.com",
  "password": "StrongPass123!",
  "confirmPassword": "StrongPass123!",
  "name": "John Doe"
}
```

#### Request Body (Option 2: First/Last name)
```json
{
  "email": "newuser@example.com",
  "password": "StrongPass123!",
  "confirmPassword": "StrongPass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Password Requirements:
- Tối thiểu 8 ký tự
- Có ít nhất 1 chữ hoa (A-Z)
- Có ít nhất 1 chữ thường (a-z)
- Có ít nhất 1 chữ số (0-9)
- Có ít nhất 1 ký tự đặc biệt (@, #, $, %, &, etc.)

#### Response Success (201)
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "newuser@example.com",
      "name": "John Doe",
      "emailVerified": false
    },
    "message": "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."
  }
}
```

---

### 1.3 POST /auth/refresh
**Mô tả:** Làm mới access token  
**Public:** ✅ Yes  
**Rate Limit:** 10 requests/min

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 1.4 POST /auth/logout
**Mô tả:** Đăng xuất (vô hiệu hóa refresh token)  
**Authentication:** 🔒 Required (JWT)

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..." // Optional
}
```

#### Response Success (204 No Content)
```
(Empty body)
```

---

### 1.5 GET /auth/verify-email?token={token}
**Mô tả:** Xác thực email qua token  
**Public:** ✅ Yes

#### Query Parameters
- `token` (required): Token từ email xác thực

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Email đã được xác thực thành công"
  }
}
```

---

### 1.6 POST /auth/forgot-password
**Mô tả:** Yêu cầu reset password (gửi email)  
**Public:** ✅ Yes  
**Rate Limit:** 3 requests/10min

#### Request Body
```json
{
  "email": "user@example.com"
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Nếu email tồn tại, link reset password đã được gửi"
  }
}
```

---

### 1.7 POST /auth/reset-password
**Mô tả:** Reset password với token  
**Public:** ✅ Yes  
**Rate Limit:** 5 requests/10min

#### Request Body
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewStrongPass123!",
  "confirmPassword": "NewStrongPass123!"
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Mật khẩu đã được reset thành công"
  }
}
```

---

### 1.8 POST /auth/change-password
**Mô tả:** Đổi mật khẩu (khi đã đăng nhập)  
**Authentication:** 🔒 Required (JWT)  
**Rate Limit:** 5 requests/min

#### Request Body
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewStrongPass123!",
  "confirmPassword": "NewStrongPass123!"
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Mật khẩu đã được thay đổi thành công"
  }
}
```

---

### 1.9 GET /auth/me
**Mô tả:** Lấy thông tin user hiện tại  
**Authentication:** 🔒 Required (JWT)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "name": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER",
    "emailVerified": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

## 2. USER MANAGEMENT APIs

### 2.1 POST /users
**Mô tả:** Tạo user mới  
**Public:** ✅ Yes  
**Rate Limit:** 10 requests/min

#### Request Body
```json
{
  "email": "newuser@example.com",
  "password": "StrongPass123!",
  "name": "Jane Smith",
  "role": "USER"
}
```

#### Response Success (201)
```json
{
  "ok": true,
  "data": {
    "id": "uuid-v4",
    "email": "newuser@example.com",
    "name": "Jane Smith",
    "role": "USER",
    "emailVerified": false,
    "createdAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 2.2 GET /users
**Mô tả:** Lấy danh sách users (có phân trang)  
**Authentication:** 🔒 Required (ADMIN, MODERATOR)  
**Rate Limit:** 100 requests/min

#### Query Parameters
```
?page=1&limit=10&sortBy=createdAt&order=desc
```

- `page` (optional, default: 1): Trang hiện tại
- `limit` (optional, default: 10): Số items mỗi trang
- `sortBy` (optional): Trường để sắp xếp
- `order` (optional): `asc` hoặc `desc`

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "uuid-v4",
        "email": "user1@example.com",
        "name": "User One",
        "role": "USER",
        "emailVerified": true,
        "createdAt": "2025-01-01T00:00:00.000Z"
      },
      {
        "id": "uuid-v4-2",
        "email": "user2@example.com",
        "name": "User Two",
        "role": "HOST",
        "emailVerified": true,
        "createdAt": "2025-01-02T00:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

### 2.3 GET /users/me
**Mô tả:** Lấy thông tin user đang đăng nhập  
**Authentication:** 🔒 Required (JWT)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "emailVerified": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 2.4 GET /users/:id
**Mô tả:** Lấy thông tin user theo ID  
**Authentication:** 🔒 Required (JWT)  
**Rate Limit:** 200 requests/min

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "emailVerified": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 2.5 PATCH /users/:id
**Mô tả:** Cập nhật thông tin user  
**Authentication:** 🔒 Required (ADMIN hoặc chính user đó)  
**Rate Limit:** 20 requests/min

#### Request Body
```json
{
  "name": "John Smith Updated",
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+84987654321"
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "name": "John Smith Updated",
    "firstName": "John",
    "lastName": "Smith",
    "phoneNumber": "+84987654321",
    "updatedAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 2.6 DELETE /users/:id
**Mô tả:** Xóa user (soft delete)  
**Authentication:** 🔒 Required (ADMIN)  
**Rate Limit:** 10 requests/min

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "User đã được xóa thành công"
  }
}
```

---

### 2.7 GET /users/stats/by-role
**Mô tả:** Thống kê số lượng user theo role  
**Authentication:** 🔒 Required (ADMIN)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "ADMIN": 5,
    "MODERATOR": 10,
    "HOST": 50,
    "USER": 1000,
    "GUEST": 200
  }
}
```

---

## 3. PROPERTY MANAGEMENT APIs

### 3.1 POST /properties
**Mô tả:** Tạo property mới  
**Authentication:** 🔒 Required (JWT)

#### Request Body
```json
{
  "title": "Cozy Apartment in City Center",
  "address": "123 Main Street, District 1, Ho Chi Minh City",
  "description": "Beautiful 2-bedroom apartment with city view",
  "lat": 10.7769,
  "lng": 106.7009,
  "amenities": {
    "wifi": true,
    "airConditioner": true,
    "kitchen": true,
    "parking": true,
    "pool": false
  }
}
```

#### Response Success (201)
```json
{
  "ok": true,
  "data": {
    "id": "uuid-v4",
    "hostId": "uuid-host",
    "title": "Cozy Apartment in City Center",
    "address": "123 Main Street, District 1, Ho Chi Minh City",
    "description": "Beautiful 2-bedroom apartment with city view",
    "lat": 10.7769,
    "lng": 106.7009,
    "amenities": {
      "wifi": true,
      "airConditioner": true,
      "kitchen": true,
      "parking": true,
      "pool": false
    },
    "status": "DRAFT",
    "createdAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 3.2 GET /properties/my
**Mô tả:** Lấy danh sách properties của user hiện tại  
**Authentication:** 🔒 Required (JWT)

#### Query Parameters
```
?skip=0&take=10
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "uuid-v4",
        "title": "Cozy Apartment in City Center",
        "address": "123 Main Street",
        "status": "ACTIVE",
        "createdAt": "2025-10-28T10:00:00.000Z"
      }
    ],
    "total": 5
  }
}
```

---

### 3.3 GET /properties/:id
**Mô tả:** Lấy chi tiết property theo ID  
**Authentication:** 🔒 Required (JWT)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "uuid-v4",
    "hostId": "uuid-host",
    "title": "Cozy Apartment in City Center",
    "address": "123 Main Street, District 1, Ho Chi Minh City",
    "description": "Beautiful 2-bedroom apartment with city view",
    "lat": 10.7769,
    "lng": 106.7009,
    "amenities": {
      "wifi": true,
      "airConditioner": true,
      "kitchen": true,
      "parking": true,
      "pool": false
    },
    "status": "ACTIVE",
    "photos": [
      {
        "id": "photo-uuid-1",
        "fileId": "file-uuid-1",
        "url": "https://cdn.example.com/photos/abc123.jpg",
        "isCover": true,
        "sortOrder": 0
      }
    ],
    "createdAt": "2025-10-28T10:00:00.000Z",
    "updatedAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 3.4 PATCH /properties/:id
**Mô tả:** Cập nhật property  
**Authentication:** 🔒 Required (Host owner)

#### Request Body
```json
{
  "title": "Updated Cozy Apartment",
  "description": "Updated description",
  "amenities": {
    "wifi": true,
    "airConditioner": true,
    "kitchen": true,
    "parking": true,
    "pool": true
  }
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "uuid-v4",
    "title": "Updated Cozy Apartment",
    "description": "Updated description",
    "updatedAt": "2025-10-28T11:00:00.000Z"
  }
}
```

---

### 3.5 POST /properties/:id/photos
**Mô tả:** Thêm ảnh vào property  
**Authentication:** 🔒 Required (Host owner)

#### Request Body
```json
{
  "fileId": "file-uuid-from-upload",
  "isCover": false,
  "sortOrder": 1
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "property-file-uuid",
    "propertyId": "property-uuid",
    "fileId": "file-uuid-from-upload",
    "isCover": false,
    "sortOrder": 1,
    "createdAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 3.6 DELETE /properties/photos/:propertyFileId
**Mô tả:** Xóa ảnh khỏi property  
**Authentication:** 🔒 Required (Host owner)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Ảnh đã được xóa thành công"
  }
}
```

---

### 3.7 PATCH /properties/:id/photos/cover/:propertyFileId
**Mô tả:** Đặt ảnh làm cover  
**Authentication:** 🔒 Required (Host owner)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Ảnh đã được đặt làm cover"
  }
}
```

---

### 3.8 PATCH /properties/:id/photos/reorder
**Mô tả:** Sắp xếp lại thứ tự ảnh  
**Authentication:** 🔒 Required (Host owner)

#### Request Body
```json
{
  "orders": [
    {
      "propertyFileId": "photo-uuid-1",
      "sortOrder": 0
    },
    {
      "propertyFileId": "photo-uuid-2",
      "sortOrder": 1
    },
    {
      "propertyFileId": "photo-uuid-3",
      "sortOrder": 2
    }
  ]
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Thứ tự ảnh đã được cập nhật"
  }
}
```

---

### 3.9 POST /properties/:id/availability
**Mô tả:** Cập nhật lịch trống/đặt của property  
**Authentication:** 🔒 Required (Host owner)

#### Request Body
```json
{
  "date": "2025-11-01",
  "available": true,
  "price": 1000000,
  "minStay": 1
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "propertyId": "uuid-v4",
    "date": "2025-11-01",
    "available": true,
    "price": 1000000,
    "minStay": 1,
    "updatedAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 3.10 GET /properties/:id/calendar
**Mô tả:** Lấy lịch trống/đặt của property  
**Authentication:** 🔒 Required (JWT)

#### Query Parameters
```
?startDate=2025-11-01&endDate=2025-11-30
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "propertyId": "uuid-v4",
    "calendar": [
      {
        "date": "2025-11-01",
        "available": true,
        "price": 1000000,
        "minStay": 1
      },
      {
        "date": "2025-11-02",
        "available": false,
        "price": 1000000,
        "minStay": 1,
        "bookingId": "booking-uuid"
      }
    ]
  }
}
```

---

## 4. BOOKING MANAGEMENT APIs

### 4.1 POST /bookings
**Mô tả:** Tạo booking mới  
**Authentication:** 🔒 Required (JWT)  
**Permission:** `BOOKING.CREATE`

#### Request Body
```json
{
  "title": "Weekend Getaway",
  "description": "Family vacation",
  "notes": "Early check-in requested",
  "amount": "3000000.00",
  "currency": "VND",
  "discount": "300000.00",
  "tax": "300000.00",
  "startTime": "2025-11-01T14:00:00.000Z",
  "endTime": "2025-11-03T12:00:00.000Z",
  "timezone": "Asia/Ho_Chi_Minh",
  "tags": ["family", "weekend"],
  "metadata": {
    "propertyId": "property-uuid",
    "numberOfGuests": 4
  }
}
```

#### Response Success (201)
```json
{
  "ok": true,
  "data": {
    "id": "booking-uuid",
    "userId": "user-uuid",
    "title": "Weekend Getaway",
    "amount": "3000000.00",
    "currency": "VND",
    "finalAmount": "3000000.00",
    "status": "PENDING",
    "startTime": "2025-11-01T14:00:00.000Z",
    "endTime": "2025-11-03T12:00:00.000Z",
    "createdAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 4.2 GET /bookings
**Mô tả:** Lấy danh sách bookings của user  
**Authentication:** 🔒 Required (JWT)  
**Permission:** `BOOKING.READ`

#### Query Parameters
```
?status=PENDING
```

- `status` (optional): PENDING, CONFIRMED, CANCELLED, COMPLETED

#### Response Success (200)
```json
{
  "ok": true,
  "data": [
    {
      "id": "booking-uuid",
      "title": "Weekend Getaway",
      "amount": "3000000.00",
      "status": "PENDING",
      "startTime": "2025-11-01T14:00:00.000Z",
      "endTime": "2025-11-03T12:00:00.000Z",
      "createdAt": "2025-10-28T10:00:00.000Z"
    }
  ]
}
```

---

### 4.3 GET /bookings/stats
**Mô tả:** Thống kê bookings của user  
**Authentication:** 🔒 Required (JWT)  
**Permission:** `BOOKING.READ`

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "total": 25,
    "pending": 3,
    "confirmed": 15,
    "cancelled": 5,
    "completed": 2,
    "totalRevenue": "75000000.00",
    "avgBookingValue": "3000000.00"
  }
}
```

---

### 4.4 GET /bookings/:id
**Mô tả:** Lấy chi tiết booking  
**Authentication:** 🔒 Required (JWT)  
**Permission:** `BOOKING.READ`

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "booking-uuid",
    "userId": "user-uuid",
    "title": "Weekend Getaway",
    "description": "Family vacation",
    "notes": "Early check-in requested",
    "amount": "3000000.00",
    "currency": "VND",
    "discount": "300000.00",
    "tax": "300000.00",
    "finalAmount": "3000000.00",
    "status": "PENDING",
    "startTime": "2025-11-01T14:00:00.000Z",
    "endTime": "2025-11-03T12:00:00.000Z",
    "timezone": "Asia/Ho_Chi_Minh",
    "tags": ["family", "weekend"],
    "metadata": {
      "propertyId": "property-uuid",
      "numberOfGuests": 4
    },
    "createdAt": "2025-10-28T10:00:00.000Z",
    "updatedAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 4.5 PUT /bookings/:id
**Mô tả:** Cập nhật booking  
**Authentication:** 🔒 Required (JWT)  
**Permission:** `BOOKING.UPDATE`

#### Request Body
```json
{
  "notes": "Updated notes",
  "metadata": {
    "numberOfGuests": 5
  }
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "booking-uuid",
    "notes": "Updated notes",
    "metadata": {
      "numberOfGuests": 5
    },
    "updatedAt": "2025-10-28T11:00:00.000Z"
  }
}
```

---

### 4.6 POST /bookings/:id/confirm
**Mô tả:** Xác nhận booking  
**Authentication:** 🔒 Required (JWT)  
**Permission:** `BOOKING.CONFIRM`

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "booking-uuid",
    "status": "CONFIRMED",
    "confirmedAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 4.7 POST /bookings/:id/cancel
**Mô tả:** Hủy booking (trigger saga compensation)  
**Authentication:** 🔒 Required (JWT)  
**Permission:** `BOOKING.CANCEL`

#### Request Body
```json
{
  "reason": "Customer requested cancellation",
  "cancelledBy": "USER"
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "booking-uuid",
    "status": "CANCELLED",
    "cancelReason": "Customer requested cancellation",
    "cancelledAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 4.8 POST /bookings/:id/refund
**Mô tả:** Xác nhận hoàn tiền  
**Authentication:** 🔒 Required (JWT)  
**Permission:** `BOOKING.REFUND`

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "booking-uuid",
    "refundStatus": "REFUNDED",
    "refundAmount": "3000000.00",
    "refundedAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 4.9 DELETE /bookings/:id
**Mô tả:** Xóa booking vĩnh viễn  
**Authentication:** 🔒 Required (JWT)  
**Permission:** `BOOKING.DELETE`

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Booking đã được xóa thành công"
  }
}
```

---

## 5. REVIEW APIs

### 5.1 POST /reviews
**Mô tả:** Tạo review mới  
**Authentication:** 🔒 Required (JWT)  
**Idempotency:** ✅ Yes (Header: `Idempotency-Key`)

#### Request Body
```json
{
  "propertyId": "property-uuid",
  "bookingId": "booking-uuid",
  "rating": 5,
  "comment": "Excellent property! Very clean and comfortable.",
  "pros": ["Clean", "Good location", "Friendly host"],
  "cons": ["WiFi could be faster"]
}
```

#### Response Success (201)
```json
{
  "ok": true,
  "data": {
    "id": "review-uuid",
    "userId": "user-uuid",
    "propertyId": "property-uuid",
    "bookingId": "booking-uuid",
    "rating": 5,
    "comment": "Excellent property! Very clean and comfortable.",
    "pros": ["Clean", "Good location", "Friendly host"],
    "cons": ["WiFi could be faster"],
    "status": "ACTIVE",
    "createdAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 5.2 GET /reviews/property/:propertyId
**Mô tả:** Lấy reviews của property (có cursor pagination)  
**Public:** ✅ Yes

#### Query Parameters
```
?cursor=review-uuid&limit=20
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "review-uuid",
        "userId": "user-uuid",
        "userName": "John Doe",
        "rating": 5,
        "comment": "Excellent property!",
        "createdAt": "2025-10-28T10:00:00.000Z"
      }
    ],
    "nextCursor": "review-uuid-next",
    "hasMore": true
  }
}
```

---

### 5.3 PATCH /reviews/:id
**Mô tả:** Cập nhật review  
**Authentication:** 🔒 Required (Review owner)  
**Idempotency:** ✅ Yes (Header: `Idempotency-Key`)

#### Request Body
```json
{
  "rating": 4,
  "comment": "Updated review comment",
  "pros": ["Clean", "Good location"],
  "cons": ["WiFi slow", "A bit noisy"]
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "review-uuid",
    "rating": 4,
    "comment": "Updated review comment",
    "updatedAt": "2025-10-28T11:00:00.000Z"
  }
}
```

---

### 5.4 DELETE /reviews/:id
**Mô tả:** Xóa review (soft delete)  
**Authentication:** 🔒 Required (Review owner hoặc ADMIN)  
**Idempotency:** ✅ Yes (Header: `Idempotency-Key`)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Review đã được xóa thành công"
  }
}
```

---

## 6. FILE UPLOAD APIs

### 6.1 POST /files/presign-put
**Mô tả:** Tạo presigned URL để upload file (Cloudflare R2)  
**Authentication:** 🔒 Required (JWT)  
**Idempotency:** ✅ Yes (Header: `Idempotency-Key` - UUID v4)

#### Request Body
```json
{
  "filename": "photo.jpg",
  "mime": "image/jpeg",
  "sizeMax": 5242880
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "fileId": "file-uuid",
    "uploadUrl": "https://r2.example.com/presigned-url",
    "method": "PUT",
    "headers": {
      "Content-Type": "image/jpeg"
    },
    "expiresIn": 3600
  }
}
```

#### Upload Flow:
1. Client gọi API này để lấy presigned URL
2. Client upload file trực tiếp lên URL bằng PUT request
3. Client gọi `/files/:fileId/complete` để hoàn tất

---

### 6.2 POST /files/presign-post
**Mô tả:** Tạo presigned POST URL (S3/MinIO - KHÔNG hỗ trợ R2)  
**Authentication:** 🔒 Required (JWT)  
**Idempotency:** ✅ Yes (Header: `Idempotency-Key`)

#### Request Body
```json
{
  "filename": "document.pdf",
  "mime": "application/pdf",
  "sizeMax": 10485760
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "fileId": "file-uuid",
    "uploadUrl": "https://s3.example.com/bucket",
    "method": "POST",
    "fields": {
      "key": "uploads/file-uuid/document.pdf",
      "policy": "base64-encoded-policy",
      "signature": "signature-string"
    },
    "expiresIn": 3600
  }
}
```

---

### 6.3 POST /files/:fileId/complete
**Mô tả:** Hoàn tất upload (verify + set status READY)  
**Authentication:** 🔒 Required (JWT)  
**Idempotent:** ✅ Yes (idempotent nếu đã READY)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "file": {
      "id": "file-uuid",
      "filename": "photo.jpg",
      "mime": "image/jpeg",
      "size": 1024000,
      "status": "READY",
      "publicUrl": "https://cdn.example.com/files/file-uuid/photo.jpg",
      "width": 1920,
      "height": 1080,
      "createdAt": "2025-10-28T10:00:00.000Z"
    }
  }
}
```

---

### 6.4 POST /files/:fileId/thumbnail
**Mô tả:** Tạo thumbnail cho ảnh (đồng bộ)  
**Authentication:** 🔒 Required (JWT)

#### Request Body
```json
{
  "width": 300,
  "height": 300,
  "quality": 80
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "thumbnailFileId": "thumbnail-file-uuid",
    "thumbnailUrl": "https://cdn.example.com/files/thumbnail-uuid/photo.thumb.jpg",
    "width": 300,
    "height": 300
  }
}
```

---

### 6.5 GET /files/:fileId/download
**Mô tả:** Download file (presigned URL hoặc redirect)  
**Authentication:** 🔒 Required (JWT)

#### Query Parameters
```
?inline=false
```

- `inline` (optional): `true` để xem trong browser, `false` để download

#### Response Success (302 Redirect)
```
Location: https://cdn.example.com/presigned-download-url
```

---

### 6.6 DELETE /files
**Mô tả:** Xóa file (soft delete)  
**Authentication:** 🔒 Required (JWT)

#### Request Body
```json
{
  "fileId": "file-uuid"
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "File đã được xóa thành công"
  }
}
```

---

## 7. INVOICE APIs

### 7.1 GET /invoices/:bookingId/pdf
**Mô tả:** Download invoice PDF  
**Authentication:** 🔒 Required (JWT)

#### Response Success (200)
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="invoice-{bookingId}.pdf"

(PDF binary data)
```

---

### 7.2 POST /invoices/:bookingId/email
**Mô tả:** Gửi invoice qua email  
**Authentication:** 🔒 Required (JWT)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Invoice email sent",
    "sentTo": "customer@example.com"
  }
}
```

---

## 8. RBAC APIs

### 8.1 POST /rbac/roles
**Mô tả:** Tạo role mới  
**Authentication:** 🔒 Required (ADMIN)

#### Request Body
```json
{
  "name": "SUPER_HOST",
  "description": "Super host with premium features",
  "permissions": ["PROPERTY.CREATE", "PROPERTY.UPDATE", "BOOKING.READ"]
}
```

#### Response Success (201)
```json
{
  "ok": true,
  "data": {
    "id": "role-uuid",
    "name": "SUPER_HOST",
    "description": "Super host with premium features",
    "permissions": ["PROPERTY.CREATE", "PROPERTY.UPDATE", "BOOKING.READ"],
    "createdAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 8.2 GET /rbac/roles
**Mô tả:** Lấy danh sách roles  
**Authentication:** 🔒 Required (ADMIN)

#### Response Success (200)
```json
{
  "ok": true,
  "data": [
    {
      "id": "role-uuid-1",
      "name": "ADMIN",
      "description": "System administrator"
    },
    {
      "id": "role-uuid-2",
      "name": "HOST",
      "description": "Property host"
    }
  ]
}
```

---

### 8.3 GET /rbac/roles/:id
**Mô tả:** Lấy chi tiết role  
**Authentication:** 🔒 Required (ADMIN)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "role-uuid",
    "name": "HOST",
    "description": "Property host",
    "permissions": ["PROPERTY.CREATE", "PROPERTY.UPDATE", "PROPERTY.DELETE"],
    "createdAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 8.4 PUT /rbac/roles/:id
**Mô tả:** Cập nhật role  
**Authentication:** 🔒 Required (ADMIN)

#### Request Body
```json
{
  "description": "Updated description",
  "permissions": ["PROPERTY.CREATE", "PROPERTY.UPDATE", "PROPERTY.DELETE", "BOOKING.READ"]
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "role-uuid",
    "description": "Updated description",
    "permissions": ["PROPERTY.CREATE", "PROPERTY.UPDATE", "PROPERTY.DELETE", "BOOKING.READ"],
    "updatedAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 8.5 DELETE /rbac/roles/:id
**Mô tả:** Xóa role  
**Authentication:** 🔒 Required (ADMIN)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Role đã được xóa thành công"
  }
}
```

---

### 8.6 POST /rbac/permissions
**Mô tả:** Tạo permission mới  
**Authentication:** 🔒 Required (ADMIN)

#### Request Body
```json
{
  "name": "PROPERTY.PUBLISH",
  "description": "Permission to publish properties",
  "resource": "PROPERTY",
  "action": "PUBLISH"
}
```

#### Response Success (201)
```json
{
  "ok": true,
  "data": {
    "id": "permission-uuid",
    "name": "PROPERTY.PUBLISH",
    "description": "Permission to publish properties",
    "resource": "PROPERTY",
    "action": "PUBLISH",
    "createdAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 8.7 GET /rbac/permissions
**Mô tả:** Lấy danh sách permissions  
**Authentication:** 🔒 Required (ADMIN)

#### Response Success (200)
```json
{
  "ok": true,
  "data": [
    {
      "id": "perm-uuid-1",
      "name": "PROPERTY.CREATE",
      "resource": "PROPERTY",
      "action": "CREATE"
    },
    {
      "id": "perm-uuid-2",
      "name": "BOOKING.READ",
      "resource": "BOOKING",
      "action": "READ"
    }
  ]
}
```

---

### 8.8 DELETE /rbac/permissions/:id
**Mô tả:** Xóa permission  
**Authentication:** 🔒 Required (ADMIN)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Permission đã được xóa thành công"
  }
}
```

---

## 9. ACL APIs

### 9.1 POST /acl/grant
**Mô tả:** Cấp quyền truy cập resource cho user  
**Authentication:** 🔒 Required (ADMIN)

#### Request Body
```json
{
  "userId": "user-uuid",
  "resourceType": "PROPERTY",
  "resourceId": "property-uuid",
  "accessLevel": "WRITE"
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "acl-uuid",
    "userId": "user-uuid",
    "resourceType": "PROPERTY",
    "resourceId": "property-uuid",
    "accessLevel": "WRITE",
    "grantedAt": "2025-10-28T10:00:00.000Z"
  }
}
```

---

### 9.2 POST /acl/check
**Mô tả:** Kiểm tra quyền truy cập  
**Authentication:** 🔒 Required (JWT)

#### Request Body
```json
{
  "userId": "user-uuid",
  "resourceType": "PROPERTY",
  "resourceId": "property-uuid",
  "accessLevel": "READ"
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "hasAccess": true
  }
}
```

---

### 9.3 GET /acl/resource/:resourceType/:resourceId
**Mô tả:** Lấy danh sách ACL của resource  
**Authentication:** 🔒 Required (ADMIN)

#### Response Success (200)
```json
{
  "ok": true,
  "data": [
    {
      "id": "acl-uuid-1",
      "userId": "user-uuid-1",
      "userName": "John Doe",
      "accessLevel": "WRITE",
      "grantedAt": "2025-10-28T10:00:00.000Z"
    },
    {
      "id": "acl-uuid-2",
      "userId": "user-uuid-2",
      "userName": "Jane Smith",
      "accessLevel": "READ",
      "grantedAt": "2025-10-27T10:00:00.000Z"
    }
  ]
}
```

---

### 9.4 GET /acl/user/:userId/resources
**Mô tả:** Lấy danh sách resources mà user có quyền truy cập  
**Authentication:** 🔒 Required (ADMIN)

#### Query Parameters
```
?resourceType=PROPERTY
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": [
    {
      "resourceType": "PROPERTY",
      "resourceId": "property-uuid-1",
      "accessLevel": "WRITE"
    },
    {
      "resourceType": "PROPERTY",
      "resourceId": "property-uuid-2",
      "accessLevel": "READ"
    }
  ]
}
```

---

### 9.5 DELETE /acl/:id
**Mô tả:** Thu hồi quyền truy cập  
**Authentication:** 🔒 Required (ADMIN)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Quyền truy cập đã được thu hồi"
  }
}
```

---

## 10. NOTIFICATIONS APIs

### 10.1 GET /notifications
**Mô tả:** Lấy danh sách notifications của user  
**Authentication:** 🔒 Required (JWT)

#### Query Parameters
```
?unreadOnly=true&limit=20&offset=0
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "notif-uuid-1",
        "userId": "user-uuid",
        "type": "BOOKING_CONFIRMED",
        "title": "Booking Confirmed",
        "message": "Your booking has been confirmed",
        "data": {
          "bookingId": "booking-uuid"
        },
        "read": false,
        "createdAt": "2025-10-28T10:00:00.000Z"
      }
    ],
    "total": 15,
    "unread": 5
  }
}
```

---

### 10.2 PATCH /notifications/:id/read
**Mô tả:** Đánh dấu notification đã đọc  
**Authentication:** 🔒 Required (JWT)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "id": "notif-uuid",
    "read": true,
    "readAt": "2025-10-28T10:05:00.000Z"
  }
}
```

---

### 10.3 PATCH /notifications/read-all
**Mô tả:** Đánh dấu tất cả notifications đã đọc  
**Authentication:** 🔒 Required (JWT)

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "message": "Đã đánh dấu tất cả thông báo là đã đọc",
    "count": 5
  }
}
```

---

## 11. SEARCH APIs

### 11.1 POST /search/properties
**Mô tả:** Tìm kiếm properties (MeiliSearch)  
**Public:** ✅ Yes

#### Request Body
```json
{
  "query": "apartment city center",
  "filters": {
    "minPrice": 500000,
    "maxPrice": 2000000,
    "amenities": ["wifi", "parking"],
    "location": {
      "lat": 10.7769,
      "lng": 106.7009,
      "radius": 5000
    }
  },
  "sort": ["price:asc"],
  "limit": 20,
  "offset": 0
}
```

#### Response Success (200)
```json
{
  "ok": true,
  "data": {
    "hits": [
      {
        "id": "property-uuid-1",
        "title": "Cozy Apartment in City Center",
        "address": "123 Main Street",
        "price": 1000000,
        "rating": 4.8,
        "reviewCount": 25,
        "amenities": ["wifi", "parking", "airConditioner"],
        "distance": 1200,
        "photos": [
          {
            "url": "https://cdn.example.com/photo1.jpg",
            "isCover": true
          }
        ]
      }
    ],
    "total": 150,
    "limit": 20,
    "offset": 0,
    "processingTimeMs": 5
  }
}
```

---

## 12. COMMON RESPONSE FORMAT

### Success Response
```json
{
  "ok": true,
  "data": {
    // Response data here
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": [
      {
        "field": "email",
        "message": "Email không hợp lệ"
      }
    ]
  },
  "path": "/api/endpoint",
  "timestamp": "2025-10-28T10:00:00.000Z"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Dữ liệu không hợp lệ |
| `UNAUTHORIZED` | 401 | Chưa đăng nhập hoặc token không hợp lệ |
| `FORBIDDEN` | 403 | Không có quyền truy cập |
| `NOT_FOUND` | 404 | Không tìm thấy dữ liệu |
| `CONFLICT` | 409 | Dữ liệu bị trùng lặp |
| `UNPROCESSABLE_ENTITY` | 422 | Không thể xử lý yêu cầu |
| `TOO_MANY_REQUESTS` | 429 | Vượt quá giới hạn rate limit |
| `INTERNAL_SERVER_ERROR` | 500 | Lỗi server |

### Pagination Response Format
```json
{
  "ok": true,
  "data": {
    "items": [...],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

## 📝 NOTES

### Authentication Headers
Hầu hết các API yêu cầu JWT token trong header:
```
Authorization: Bearer {access_token}
```

### Idempotency Headers
Một số API hỗ trợ idempotency để tránh duplicate request:
```
Idempotency-Key: {uuid-v4}
```

### Content-Type
Request body luôn sử dụng:
```
Content-Type: application/json
```

### Rate Limiting
Khi vượt rate limit, server trả về:
- HTTP Status: 429 Too Many Requests
- Header: `Retry-After: {seconds}`

### Timezone
Tất cả datetime đều sử dụng ISO 8601 format với UTC:
```
2025-10-28T10:00:00.000Z
```

### File Size Limits
- Images: 5MB max
- Documents: 10MB max
- Videos: 100MB max

---

## 🔗 QUICK LINKS

- [Swagger UI](http://localhost:3000/api/docs) - Interactive API documentation
- [Postman Collection](../postman-collection.json) - Import vào Postman
- [HTTP Test File](../api-test.http) - Test với VS Code REST Client
- [Authentication Guide](./AUTH-IMPLEMENTATION-GUIDE.md)
- [RBAC Guide](./RBAC_CONSTANTS_GUIDE.md)
- [Saga Pattern Guide](./SAGA_PATTERN_GUIDE.md)

---

**Version:** 1.0.0  
**Last Updated:** 28/10/2025  
**Maintained by:** Development Team
