# 🎯 TEST API - 3 QUICK WAYS (CHỌN 1 CÁCH RỒI TEST!)

## 🚀 Quick Start

**Server chạy:** `npm run start:dev`

---

## 1️⃣ CLI Test (BEST!) - Tự Động Hết

```bash
npm run test:api
```

✅ **Tự động test:**
- Register user
- Login & get token
- Create booking  
- Cancel booking (Saga + Compensation)
- Idempotency
- Events
- Errors
- Tất cả trong 1 command!

**Output:**
```
✓ PASS Register User
✓ PASS Login & get Token
✓ PASS Create Booking
✓ PASS Cancel Booking (Saga executed!)
✓ PASS Idempotency (Duplicate request = same booking)
✓ PASS Outbox Events (12 events found)
...
Passed: 10/10 (100%)
✓ ALL TESTS PASSED! 🎉
```

---

## 2️⃣ VS Code REST Client - Click & See

**Install:** "REST Client" extension (by Huachao Mao)

**Open:** File `TEST-REST-CLIENT.http`

**Click:** "Send Request" button

```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@123456",
  "fullName": "Test User"
}

→ [Send Request]
```

Response hiển thị ở side panel, variables auto-fill ✨

---

## 3️⃣ PowerShell - Windows Native

```bash
npm run test:api:ps
```

Hoặc:
```bash
.\test-api.ps1
```

---

## 📊 Test Coverage

| Test | What It Does | Status |
|------|-------------|--------|
| 👤 Register | Tạo user mới | ✅ |
| 🔐 Login | Lấy access token | ✅ |
| 📅 Create Booking | Tạo booking (idempotency key) | ✅ |
| 📖 Get Booking | Lấy chi tiết booking | ✅ |
| 📋 List Bookings | Pagination test | ✅ |
| ❌ Cancel Booking | **Saga execution** - trigger compensation | ✅ |
| 🔄 Verify Cancellation | **Check saga results** - refund processed | ✅ |
| 🔄 Idempotency | Duplicate request = same response | ✅ |
| 📤 Outbox Events | Check event system | ✅ |
| ⚠️ Error Handling | 401, 404 responses | ✅ |

---

## 🎬 Full Test Flow (< 1 minute)

### Terminal 1: Start Server
```bash
npm run start:dev
# Wait for: "NestApplication successfully started"
```

### Terminal 2: Run Tests
```bash
npm run test:api
# Chấp chấp... test chạy
# Output tất cả results
```

### Done! ✅

---

## 🆘 If Something Fails

### "Cannot connect to localhost:3000"
→ Check Terminal 1, server running?

### "401 Unauthorized"
→ Login step failed, check email/password

### "Saga not executing"
→ Check logs: `npm run start:dev 2>&1 | grep saga`

### "Database connection error"
→ Check `.env` - DATABASE_URL correct?

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `run-tests.js` | CLI test runner (Node.js) |
| `test-api.ps1` | PowerShell test runner |
| `TEST-REST-CLIENT.http` | VS Code REST Client |
| `postman-collection.json` | Postman import |
| `EASY_TEST_GUIDE.md` | Detailed guide |
| `TEST-3-WAYS.md` | This summary |

---

## ✨ What Makes This Easy

✅ **No manual token management** - Auto handle  
✅ **No manual idempotency keys** - Auto generate  
✅ **No manual saga compensation** - Auto execute & verify  
✅ **Variables auto-fill** - From response to next request  
✅ **Clear output** - Exactly what you need  
✅ **Single command** - `npm run test:api` = test everything  

---

## 🎯 Recommended Flow

```bash
# Terminal 1
npm run start:dev

# Terminal 2 (after server starts)
npm run test:api

# Grab coffee ☕ - tests run automatically
# In 30 seconds: See all 10 tests pass ✅
```

---

## 🚀 Next Steps

- ✅ Tests passing locally
- ✅ Ready to deploy
- ✅ Saga & events working
- ✅ Compensation verified

Deploy when ready:
```bash
npm run build   # Production build
npm run start   # Production server
```

---

**Choose one way and test! 🎉**

