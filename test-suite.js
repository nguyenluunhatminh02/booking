const http = require('http');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function test() {
  console.log('🧪 Testing RBAC Implementation\n');

  try {
    // Test 1: Seed RBAC
    console.log('1️⃣  Seeding RBAC data...');
    const seedRes = await makeRequest('POST', '/rbac/admin/seed');
    console.log(`   Status: ${seedRes.status}`);
    console.log(`   Message: ${seedRes.data.message || seedRes.data}\n`);

    // Test 2: Create user
    console.log('2️⃣  Creating test user...');
    const createUserRes = await makeRequest('POST', '/users', {
      email: 'test@example.com',
      password: 'Test@123456',
      name: 'Test User'
    });
    console.log(`   Status: ${createUserRes.status}`);
    if (createUserRes.data.id) {
      console.log(`   User ID: ${createUserRes.data.id}\n`);
    } else {
      console.log(`   Response: ${JSON.stringify(createUserRes.data)}\n`);
    }

    // Test 3: Login
    console.log('3️⃣  Logging in...');
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: 'test@example.com',
      password: 'Test@123456'
    });
    console.log(`   Status: ${loginRes.status}`);
    if (loginRes.data.access_token) {
      const token = loginRes.data.access_token;
      console.log(`   Token: ${token.substring(0, 30)}...\n`);

      // Test 4: Access protected endpoint
      console.log('4️⃣  Testing protected endpoint (GET /bookings)...');
      const bookingsReq = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/bookings',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`   Status: ${res.statusCode}`);
          if (res.statusCode === 200) {
            console.log(`   ✅ Access granted\n`);
          } else {
            console.log(`   Response: ${data}\n`);
          }

          // Test 5: Permission denied
          console.log('5️⃣  Testing permission denial (POST /bookings/1/refund)...');
          const refundReq = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/bookings/1/refund',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              console.log(`   Status: ${res.statusCode}`);
              if (res.statusCode === 403) {
                console.log(`   ✅ Permission correctly denied (403)\n`);
              } else {
                console.log(`   Response: ${data}\n`);
              }

              console.log('✅ All tests completed!');
            });
          });
          refundReq.on('error', console.error);
          refundReq.end();
        });
      });
      bookingsReq.on('error', console.error);
      bookingsReq.end();
    } else {
      console.log(`   Response: ${JSON.stringify(loginRes.data)}\n`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
