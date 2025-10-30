#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null) {
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
    // 1. Seed RBAC data
    console.log('1️⃣ Seeding RBAC data...');
    const seedRes = await makeRequest('POST', '/rbac/admin/seed', {});
    console.log(`   Status: ${seedRes.status}`);
    if (seedRes.data.success) {
      console.log('   ✅ Success:', seedRes.data.message);
    } else {
      console.log('   ❌ Failed:', seedRes.data);
    }
    
    // 2. Create test user
    console.log('\n2️⃣ Creating test user...');
    const userRes = await makeRequest('POST', '/users', {
      email: `testuser${Date.now()}@example.com`,
      password: 'Test@1234',
      fullName: 'Test User'
    });
    console.log(`   Status: ${userRes.status}`);
    if (userRes.status === 201) {
      console.log('   ✅ User created:', userRes.data.data?.id);
    } else {
      console.log('   ❌ Failed:', userRes.data);
    }
    
    // 3. Login
    console.log('\n3️⃣ Logging in...');
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: userRes.data.data?.email,
      password: 'Test@1234'
    });
    console.log(`   Status: ${loginRes.status}`);
    if (loginRes.status === 200) {
      const token = loginRes.data.data?.access_token;
      console.log('   ✅ Login successful, token:', token?.substring(0, 20) + '...');
      
      // 4. Test protected endpoint (should fail without permission)
      console.log('\n4️⃣ Testing protected endpoint (no permission)...');
      const bookingRes = await makeRequest('GET', '/bookings', null);
      console.log(`   Status: ${bookingRes.status}`);
      console.log(`   ${bookingRes.status === 401 ? '✅' : '❌'} Expected 401 Unauthorized`);
      
    } else {
      console.log('   ❌ Login failed:', loginRes.data);
    }
    
    console.log('\n✅ Testing completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Wait for server to be ready
setTimeout(runTests, 2000);
