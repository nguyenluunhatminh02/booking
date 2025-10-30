# 🚀 IMMEDIATE ACTION - Test API Ngay Bây Giờ!

## 👉 Here's What to Do (Copy-Paste Ready)

### Step 1: Open Terminal 1
```bash
cd c:\tipjs\template\booking\booking
npm run start:dev
```

**Wait for this message:**
```
✓ Nest application successfully started
✓ API listening on http://localhost:3000
```

### Step 2: Open Terminal 2 (Different Window)
```bash
cd c:\tipjs\template\booking\booking
npm run test:api
```

**You'll see:**
```
═══════════════════════════════════════════════════════
  🚀 BOOKING API - FULL TEST SUITE 🚀
═══════════════════════════════════════════════════════

API Base: http://localhost:3000
Start Time: 14:23:45

[1/10] 👤 Testing: Register User
  ✓ PASS Status 201 - Got 201
  ✓ PASS Response has userId
  ✓ Created user: 550e8400-e29b-41d4-a716-446655440000

[2/10] 🔐 Testing: Login & Get Token
  ✓ PASS Status 200 - Got 200
  ✓ PASS Response has accessToken
  ✓ Token acquired (256 chars)

... [8 more tests] ...

📊 TEST SUMMARY
Passed: 10/10 (100%)

✓ ALL TESTS PASSED! 🎉
```

---

## 🎯 That's It! You're Done!

Khó test API? Không nữa! 🎉

- ✅ Register user automatically
- ✅ Get token automatically  
- ✅ Create booking automatically
- ✅ Test saga (cancel + compensation)
- ✅ Test idempotency
- ✅ Test events
- ✅ Test errors
- ✅ All in 30 seconds ⚡

---

## 🔄 Alternative Methods

### Method 2: Visual Testing (VS Code)

```bash
# Same Terminal 1 (npm run start:dev still running)
# Open in VS Code: TEST-REST-CLIENT.http
# Click "Send Request" on each request
# See response appear on right side
```

### Method 3: PowerShell

```bash
# Terminal 2
npm run test:api:ps
# or
.\test-api.ps1
```

---

## 📊 What Each Test Does

| Test | Does | Result |
|------|------|--------|
| 1. Register | Create new user | ✅ userId |
| 2. Login | Get access token | ✅ accessToken |
| 3. Create Booking | Make booking with idempotency | ✅ bookingId |
| 4. Get Booking | Fetch booking details | ✅ Booking data |
| 5. List Bookings | Get all with pagination | ✅ Array |
| 6. Cancel Booking | **Trigger Saga** | ✅ Compensation executed |
| 7. Verify Cancel | Check refund processed | ✅ Status = CANCELLED |
| 8. Idempotency | Duplicate request = same | ✅ Same bookingId |
| 9. Outbox Events | Check event system | ✅ Events in DB |
| 10. Error Handling | 401, 404 responses | ✅ Correct codes |

---

## 🆘 Help!

### "Can't connect to server"
```bash
# Check Terminal 1: npm run start:dev still running?
# Check port: netstat -ano | findstr :3000
```

### "401 Unauthorized"
```
Server running but login failed?
Check: PASSWORD in code = Test@123456
```

### "Test Hangs"
```
Kill Terminal 1, restart:
npm run start:dev
```

---

## 📁 Files You Can Look At

| File | For |
|------|-----|
| `run-tests.js` | See how tests work |
| `TEST-REST-CLIENT.http` | Individual test examples |
| `test-api.ps1` | Windows version |
| `postman-collection.json` | Postman import |

---

## ✨ Key Features Tested

✅ **Saga Pattern** - Booking cancellation with compensation  
✅ **Event System** - Outbox + handlers  
✅ **Idempotency** - Duplicate request safety  
✅ **Authentication** - JWT tokens  
✅ **Pagination** - List with limits  
✅ **Error Handling** - 401, 404, validation  

---

## 🎬 TL;DR (Too Long; Didn't Read)

```bash
# Terminal 1
npm run start:dev

# Terminal 2 (after seeing "successfully started")
npm run test:api

# Done! ✅
```

---

## 🚀 Next Steps After Tests Pass

✅ All tests passing?
✅ Saga working?
✅ Compensation triggered?
✅ Events in outbox?

**Then:**
```bash
npm run build    # Create production build
npm run start    # Run production
```

Ready to deploy! 🎉

---

**Pick one method above and test now!** 👆

Choose:
- 🔥 **CLI** (fastest, automated)
- 👁️ **REST Client** (visual, interactive)
- 🪟 **PowerShell** (Windows native)

All give you the same test coverage! ✨

