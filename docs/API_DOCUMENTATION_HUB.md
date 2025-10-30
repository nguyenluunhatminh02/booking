# 📚 API DOCUMENTATION HUB

> **Trung tâm tài liệu API - Tất cả thông tin bạn cần để làm việc với Booking System API**

---

## 🎯 BẮT ĐẦU NHANH

### 1️⃣ Document Chính - ĐỌC ĐẦU TIÊN
📖 **[API Complete Reference](./API_COMPLETE_REFERENCE.md)** - Document chi tiết TẤT CẢ APIs
- ✅ Request body đầy đủ với ví dụ cụ thể
- ✅ Response body chi tiết
- ✅ Error codes và handling
- ✅ Authentication & Authorization
- ✅ Dễ đọc, dễ hiểu, dễ follow

### 2️⃣ Testing Tools
🧪 **[HTTP Test File](../api-test.http)** - Test API trực tiếp trong VS Code
```
Cài extension: REST Client
Mở file api-test.http và click "Send Request"
```

🎨 **[Swagger UI](http://localhost:3000/api/docs)** - Interactive API Documentation
```
Khởi động server: npm run start:dev
Truy cập: http://localhost:3000/api/docs
```

📮 **[Postman Collection](../postman-collection.json)** - Import vào Postman
```
Import file vào Postman để test APIs
```

---

## 📚 TÀI LIỆU CHI TIẾT

### Core Features

| Document | Mô Tả |
|----------|-------|
| **[Authentication Guide](./AUTH-IMPLEMENTATION-GUIDE.md)** | Hướng dẫn đầy đủ về authentication flow |
| **[RBAC Guide](./RBAC_CONSTANTS_GUIDE.md)** | Role-Based Access Control - quản lý quyền |
| **[Saga Pattern Guide](./SAGA_PATTERN_GUIDE.md)** | Distributed transactions với Saga pattern |
| **[Dependency Injection](./DEPENDENCY_INJECTION_EXPLAINED.md)** | Hiểu về DI trong NestJS |

### Architecture & Design

| Document | Mô Tả |
|----------|-------|
| **[Architecture Overview](./ARCHITECTURE.md)** | Tổng quan kiến trúc hệ thống |
| **[Auth Architecture](./AUTH-ARCHITECTURE-EXPLAINED.md)** | Chi tiết kiến trúc authentication |
| **[File Index](./FILE_INDEX_COMPLETE.md)** | Index tất cả files trong project |

### Guides & References

| Document | Mô Tả |
|----------|-------|
| **[Quick Start](./QUICK_START.md)** | Bắt đầu nhanh với project |
| **[Services Usage Guide](./SERVICES_USAGE_GUIDE.md)** | Hướng dẫn sử dụng services |
| **[MeiliSearch Setup](./MEILISEARCH_SETUP.md)** | Cài đặt search engine |

---

## 🚀 WORKFLOW THỰC TẾ

### Kịch bản 1: Tôi muốn test API Login
```
1. Đọc: API_COMPLETE_REFERENCE.md → Section 1.1 POST /auth/login
2. Xem request/response body
3. Test bằng:
   - Option A: Mở api-test.http → Tìm "Login" → Click "Send Request"
   - Option B: Mở Swagger UI → Tìm "Authentication" → Try "POST /auth/login"
   - Option C: Dùng Postman collection
```

### Kịch bản 2: Tôi muốn tích hợp API Booking
```
1. Đọc: API_COMPLETE_REFERENCE.md → Section 4 (Booking APIs)
2. Xem flow: Create → Get → Update → Cancel
3. Xem request body của từng endpoint
4. Test từng bước trong api-test.http
5. Tích hợp vào frontend/mobile
```

### Kịch bản 3: Tôi gặp lỗi 401 Unauthorized
```
1. Đọc: API_COMPLETE_REFERENCE.md → Section 12 (Error Codes)
2. Kiểm tra: Authorization header có đúng format không?
3. Đọc: AUTH-IMPLEMENTATION-GUIDE.md để hiểu auth flow
4. Test lại với token mới từ /auth/login
```

### Kịch bản 4: Tôi muốn implement search
```
1. Đọc: API_COMPLETE_REFERENCE.md → Section 11 (Search APIs)
2. Xem request body với filters
3. Đọc: MEILISEARCH_SETUP.md để setup search engine
4. Test với api-test.http
```

---

## 📖 ĐỌC THEO THỨ TỰ (Recommended)

### 🔰 Cho người mới bắt đầu

1. **[QUICK_START.md](./QUICK_START.md)** - Khởi động project
2. **[API_COMPLETE_REFERENCE.md](./API_COMPLETE_REFERENCE.md)** - Document API chính ⭐
3. **[AUTH-IMPLEMENTATION-GUIDE.md](./AUTH-IMPLEMENTATION-GUIDE.md)** - Hiểu về authentication
4. Test APIs với `api-test.http` hoặc Swagger UI

### 🎓 Cho developer có kinh nghiệm

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Hiểu kiến trúc tổng thể
2. **[API_COMPLETE_REFERENCE.md](./API_COMPLETE_REFERENCE.md)** - Reference APIs ⭐
3. **[RBAC_CONSTANTS_GUIDE.md](./RBAC_CONSTANTS_GUIDE.md)** - Permission system
4. **[SAGA_PATTERN_GUIDE.md](./SAGA_PATTERN_GUIDE.md)** - Distributed transactions

### 🏗️ Cho architect/tech lead

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design
2. **[AUTH-ARCHITECTURE-EXPLAINED.md](./AUTH-ARCHITECTURE-EXPLAINED.md)** - Auth architecture
3. **[SAGA_PATTERN_GUIDE.md](./SAGA_PATTERN_GUIDE.md)** - Transaction patterns
4. **[DEPENDENCY_INJECTION_EXPLAINED.md](./DEPENDENCY_INJECTION_EXPLAINED.md)** - DI patterns

---

## 🎯 TÌM KIẾM NHANH

### Authentication & Authorization
- Login: [Section 1.1](./API_COMPLETE_REFERENCE.md#11-post-authlogin)
- Register: [Section 1.2](./API_COMPLETE_REFERENCE.md#12-post-authregister)
- Refresh Token: [Section 1.3](./API_COMPLETE_REFERENCE.md#13-post-authrefresh)
- Change Password: [Section 1.8](./API_COMPLETE_REFERENCE.md#18-post-authchange-password)
- Get Profile: [Section 1.9](./API_COMPLETE_REFERENCE.md#19-get-authme)

### User Management
- Create User: [Section 2.1](./API_COMPLETE_REFERENCE.md#21-post-users)
- List Users: [Section 2.2](./API_COMPLETE_REFERENCE.md#22-get-users)
- Get User: [Section 2.4](./API_COMPLETE_REFERENCE.md#24-get-usersid)
- Update User: [Section 2.5](./API_COMPLETE_REFERENCE.md#25-patch-usersid)

### Property Management
- Create Property: [Section 3.1](./API_COMPLETE_REFERENCE.md#31-post-properties)
- My Properties: [Section 3.2](./API_COMPLETE_REFERENCE.md#32-get-propertiesmy)
- Update Property: [Section 3.4](./API_COMPLETE_REFERENCE.md#34-patch-propertiesid)
- Upload Photos: [Section 3.5](./API_COMPLETE_REFERENCE.md#35-post-propertiesidphotos)

### Booking Management
- Create Booking: [Section 4.1](./API_COMPLETE_REFERENCE.md#41-post-bookings)
- My Bookings: [Section 4.2](./API_COMPLETE_REFERENCE.md#42-get-bookings)
- Confirm Booking: [Section 4.6](./API_COMPLETE_REFERENCE.md#46-post-bookingsidconfirm)
- Cancel Booking: [Section 4.7](./API_COMPLETE_REFERENCE.md#47-post-bookingsidcancel)

### File Upload
- Presign PUT: [Section 6.1](./API_COMPLETE_REFERENCE.md#61-post-filespresign-put)
- Complete Upload: [Section 6.3](./API_COMPLETE_REFERENCE.md#63-post-filesfileidcomplete)
- Create Thumbnail: [Section 6.4](./API_COMPLETE_REFERENCE.md#64-post-filesfileidthumbnail)

---

## 🛠️ TOOLS & UTILITIES

### Development Tools
```bash
# Start development server
npm run start:dev

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Format code
npm run format

# Lint code
npm run lint
```

### Database Tools
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Prisma Studio (DB GUI)
npm run prisma:studio

# Seed database
npm run seed
```

### Docker Services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d postgres
docker-compose up -d redis
docker-compose up -d meilisearch

# Stop all services
docker-compose down
```

---

## 📞 SUPPORT & CONTACT

### Issues & Questions
- **GitHub Issues**: [Create an issue](https://github.com/your-repo/issues)
- **Slack Channel**: #booking-system-support
- **Email**: dev-team@example.com

### Contributing
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines
- **[CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)** - Code of conduct

---

## 🎓 LEARNING RESOURCES

### NestJS
- [Official Documentation](https://docs.nestjs.com/)
- [NestJS Fundamentals](https://courses.nestjs.com/)
- [NestJS Best Practices](https://github.com/nestjs/nest/wiki/Best-Practices)

### Prisma
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

### Architecture Patterns
- [Microservices Patterns](https://microservices.io/patterns/)
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Event Sourcing](https://microservices.io/patterns/data/event-sourcing.html)

---

## 📋 CHECKLIST

### ✅ Tôi đã làm gì để bắt đầu?

- [ ] Đọc [QUICK_START.md](./QUICK_START.md)
- [ ] Cài đặt dependencies (`npm install`)
- [ ] Setup database (PostgreSQL)
- [ ] Chạy migrations (`npm run prisma:migrate`)
- [ ] Start dev server (`npm run start:dev`)
- [ ] Truy cập Swagger UI (http://localhost:3000/api/docs)
- [ ] Đọc [API_COMPLETE_REFERENCE.md](./API_COMPLETE_REFERENCE.md) ⭐
- [ ] Test một vài APIs với api-test.http
- [ ] Hiểu authentication flow từ [AUTH-IMPLEMENTATION-GUIDE.md](./AUTH-IMPLEMENTATION-GUIDE.md)

### ✅ Tôi đã sẵn sàng phát triển?

- [ ] Hiểu kiến trúc từ [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ ] Hiểu RBAC từ [RBAC_CONSTANTS_GUIDE.md](./RBAC_CONSTANTS_GUIDE.md)
- [ ] Hiểu Saga Pattern từ [SAGA_PATTERN_GUIDE.md](./SAGA_PATTERN_GUIDE.md)
- [ ] Biết cách test APIs
- [ ] Biết cách handle errors
- [ ] Hiểu request/response format

---

## 🌟 HIGHLIGHTS

### Document Chính - ĐỌC ĐẦU TIÊN ⭐
👉 **[API_COMPLETE_REFERENCE.md](./API_COMPLETE_REFERENCE.md)**

Document này chứa:
- ✅ **TẤT CẢ** APIs với request/response body đầy đủ
- ✅ Ví dụ cụ thể, dễ hiểu, dễ copy-paste
- ✅ Error handling và status codes
- ✅ Authentication requirements
- ✅ Rate limiting info
- ✅ Validation rules
- ✅ Common patterns và best practices

**Tại sao document này quan trọng?**
1. **Dễ đọc**: Format rõ ràng, có mục lục
2. **Dễ tìm**: Quick search links
3. **Dễ test**: Copy request body và test ngay
4. **Đầy đủ**: Không thiếu thông tin quan trọng
5. **Cập nhật**: Luôn sync với code

---

**Happy Coding! 🚀**

**Version:** 1.0.0  
**Last Updated:** 28/10/2025  
**Maintained by:** Development Team
