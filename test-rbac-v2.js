#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = `testuser${Date.now()}@example.com`;
const TEST_PASSWORD = 'Test@1234';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting RBAC Testing...\n');
  
  try {
    // 1. Create test user
    console.log('1️⃣ Creating test user...');
    const userRes = await makeRequest('POST', '/users', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      fullName: 'Test User'
    });
    console.log(`   Status: ${userRes.status}`);
    let userId, userToken;
    
    if (userRes.status === 201) {
      console.log('   ✅ User created:', userRes.data.data?.id);
      userId = userRes.data.data?.id;
    } else {
      console.log('   ❌ Failed:', userRes.data);
      return;
    }
    
    // 2. Login
    console.log('\n2️⃣ Logging in...');
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    console.log(`   Status: ${loginRes.status}`);
    if (loginRes.status === 200) {
      userToken = loginRes.data.data?.access_token;
      console.log('   ✅ Login successful');
      console.log('   Token:', userToken?.substring(0, 30) + '...');
      
      // 3. Test protected endpoint (GET /bookings - requires booking.read permission)
      console.log('\n3️⃣ Testing protected endpoint (GET /bookings - no permission yet)...');
      const bookingRes = await makeRequest('GET', '/bookings', null, userToken);
      console.log(`   Status: ${bookingRes.status}`);
      if (bookingRes.status === 403) {
        console.log('   ✅ Correctly denied (no booking.read permission)');
        console.log('   Error:', bookingRes.data?.error?.message);
      } else if (bookingRes.status === 200) {
        console.log('   ⚠️  Got 200 - might have default role assigned');
      } else {
        console.log('   ❌ Unexpected status:', bookingRes.data);
      }
      
      // 4. Try to create booking (requires booking.create)
      console.log('\n4️⃣ Testing create booking (requires booking.create - no permission yet)...');
      const createRes = await makeRequest('POST', '/bookings', {
        guestName: 'Test Guest',
        checkInDate: '2025-11-01',
        checkOutDate: '2025-11-05',
        numberOfGuests: 2
      }, userToken);
      console.log(`   Status: ${createRes.status}`);
      if (createRes.status === 403 || createRes.status === 401) {
        console.log('   ✅ Correctly denied (no booking.create permission)');
        console.log('   Error:', createRes.data?.error?.message);
      } else {
        console.log('   Response:', createRes.data);
      }
      
    } else {
      console.log('   ❌ Login failed:', loginRes.data);
    }
    
    console.log('\n✅ Testing completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

// Wait 5 seconds for server to recompile
console.log('⏳ Waiting 5 seconds for server to recompile...\n');
setTimeout(runTests, 5000);
