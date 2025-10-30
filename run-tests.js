#!/usr/bin/env node

/**
 * 🚀 Interactive API Test Runner
 * Run all tests with automatic token management & idempotency
 * Usage: node run-tests.js [options]
 */

const http = require('http');
const https = require('https');
const readline = require('readline');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
let accessToken = '';
let userId = '';
let bookingId = '';
let email = '';

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  const msg = details ? ` - ${details}` : '';
  log(`  ${status} ${name}${msg}`);
}

function logSection(title) {
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'═'.repeat(60)}\n`, 'cyan');
}

/**
 * Make HTTP Request
 */
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (accessToken && !headers['Authorization']) {
      options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Test 1: Register User
 */
async function testRegister() {
  logSection('1️⃣  Test: Register User');
  try {
    email = `test_${Date.now()}@example.com`;
    const response = await makeRequest('POST', '/auth/register', {
      email,
      password: 'Test@123456',
      fullName: 'Test User',
    });

    logTest('Status 201', response.status === 201, `Got ${response.status}`);
    const passed = response.status === 201 && response.body?.data?.userId;
    logTest('Response has userId', passed);

    if (response.body?.data?.userId) {
      userId = response.body.data.userId;
      log(`✓ Created user: ${userId}`, 'green');
    }
    return passed;
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 2: Login & Get Token
 */
async function testLogin() {
  logSection('2️⃣  Test: Login');
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email,
      password: 'Test@123456',
    });

    logTest('Status 200', response.status === 200, `Got ${response.status}`);
    const passed = response.status === 200 && response.body?.data?.accessToken;
    logTest('Response has accessToken', passed);

    if (response.body?.data?.accessToken) {
      accessToken = response.body.data.accessToken;
      log(`✓ Token acquired (length: ${accessToken.length})`, 'green');
    }
    return passed;
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 3: Create Booking
 */
async function testCreateBooking() {
  logSection('3️⃣  Test: Create Booking');
  try {
    const idempotencyKey = `booking_${Date.now()}`;
    const response = await makeRequest(
      'POST',
      '/bookings',
      {
        propertyId: 'prop_test_123',
        checkIn: '2025-11-01',
        checkOut: '2025-11-05',
        numberOfGuests: 2,
        totalPrice: '1000',
      },
      { 'Idempotency-Key': idempotencyKey }
    );

    logTest('Status 201', response.status === 201, `Got ${response.status}`);
    const passed = response.status === 201 && response.body?.data?.bookingId;
    logTest('Response has bookingId', passed);

    if (response.body?.data?.bookingId) {
      bookingId = response.body.data.bookingId;
      log(`✓ Created booking: ${bookingId}`, 'green');
    }
    return passed;
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 4: Get Booking Details
 */
async function testGetBooking() {
  logSection('4️⃣  Test: Get Booking Details');
  try {
    const response = await makeRequest('GET', `/bookings/${bookingId}`);

    logTest('Status 200', response.status === 200, `Got ${response.status}`);
    const passed =
      response.status === 200 &&
      response.body?.data?.bookingId === bookingId &&
      response.body?.data?.status;
    logTest('Response has booking data', passed);
    logTest('Status is valid', response.body?.data?.status, `Status: ${response.body?.data?.status}`);

    return passed;
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 5: List Bookings (Pagination)
 */
async function testListBookings() {
  logSection('5️⃣  Test: List Bookings');
  try {
    const response = await makeRequest('GET', '/bookings?page=1&limit=10');

    logTest('Status 200', response.status === 200, `Got ${response.status}`);
    const isArray = Array.isArray(response.body?.data);
    logTest('Response is array', isArray);
    logTest('Has pagination', response.body?.pagination, `Total: ${response.body?.pagination?.total}`);

    return response.status === 200 && isArray;
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 6: Cancel Booking (Saga Execution)
 */
async function testCancelBooking() {
  logSection('6️⃣  Test: Cancel Booking (Saga Execution)');
  try {
    const idempotencyKey = `cancel_${Date.now()}`;
    const response = await makeRequest(
      'PATCH',
      `/bookings/${bookingId}/cancel`,
      { reason: 'User requested cancellation' },
      { 'Idempotency-Key': idempotencyKey }
    );

    logTest('Status 200', response.status === 200, `Got ${response.status}`);
    const hasCancelled = response.body?.data?.status?.includes('CANCELLED');
    logTest('Booking cancelled', hasCancelled, `Status: ${response.body?.data?.status}`);
    logTest('Refund amount exists', response.body?.data?.refundAmount, `Amount: ${response.body?.data?.refundAmount}`);

    const passed = response.status === 200 && hasCancelled;
    if (passed) {
      log(`✓ Saga executed successfully!`, 'green');
    }
    return passed;
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 7: Verify Saga Compensation
 */
async function testVerifyCancellation() {
  logSection('7️⃣  Test: Verify Saga Compensation');
  try {
    const response = await makeRequest('GET', `/bookings/${bookingId}`);

    logTest('Status 200', response.status === 200, `Got ${response.status}`);
    const isCancelled = response.body?.data?.status === 'CANCELLED';
    logTest('Status persisted as CANCELLED', isCancelled);

    if (response.body?.data?.compensation) {
      logTest('Compensation info saved', true);
      log(`  Compensation steps: ${response.body.data.compensation.steps}`, 'dim');
    }

    return response.status === 200 && isCancelled;
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 8: Idempotency Check
 */
async function testIdempotency() {
  logSection('8️⃣  Test: Idempotency (Duplicate Request)');
  try {
    const idempotencyKey = `idempotency_${Date.now()}`;

    // First request
    log('Sending first request...', 'dim');
    const response1 = await makeRequest(
      'POST',
      '/bookings',
      {
        propertyId: 'prop_idempotent_123',
        checkIn: '2025-12-01',
        checkOut: '2025-12-05',
        numberOfGuests: 3,
        totalPrice: '1500',
      },
      { 'Idempotency-Key': idempotencyKey }
    );

    const firstId = response1.body?.data?.bookingId;
    logTest('First request status', [201, 200].includes(response1.status), `Got ${response1.status}`);
    logTest('First request has bookingId', !!firstId, `ID: ${firstId}`);

    // Wait a moment
    await new Promise((r) => setTimeout(r, 500));

    // Second request (identical)
    log('Sending duplicate request with same Idempotency-Key...', 'dim');
    const response2 = await makeRequest(
      'POST',
      '/bookings',
      {
        propertyId: 'prop_idempotent_123',
        checkIn: '2025-12-01',
        checkOut: '2025-12-05',
        numberOfGuests: 3,
        totalPrice: '1500',
      },
      { 'Idempotency-Key': idempotencyKey }
    );

    const secondId = response2.body?.data?.bookingId;
    logTest('Second request status', response2.status === 200, `Got ${response2.status}`);
    logTest('Returns same booking (idempotent)', firstId === secondId, `First: ${firstId}, Second: ${secondId}`);

    const passed = response2.status === 200 && firstId === secondId;
    if (passed) {
      log(`✓ Idempotency working correctly!`, 'green');
    }
    return passed;
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 9: Outbox Events
 */
async function testOutboxEvents() {
  logSection('9️⃣  Test: Outbox Events');
  try {
    const response = await makeRequest('GET', '/outbox?status=SENT&limit=20');

    logTest('Status 200', response.status === 200, `Got ${response.status}`);
    const isArray = Array.isArray(response.body?.data);
    logTest('Response is array', isArray);

    if (isArray && response.body?.data?.length > 0) {
      logTest(`Found ${response.body.data.length} events`, true);
      log(`  Event types: ${response.body.data.slice(0, 3).map((e) => e.eventType).join(', ')}`, 'dim');
    }

    return response.status === 200 && isArray;
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 10: Error Handling
 */
async function testErrorHandling() {
  logSection('🔟 Test: Error Handling');
  try {
    // Test unauthorized
    const response1 = await makeRequest('GET', '/bookings', null, {});
    delete response1.headers['authorization'];
    
    const response2 = await makeRequest('GET', '/bookings/invalid-id');
    
    logTest('Unauthorized returns 401', response1.status === 401, `Got ${response1.status}`);
    logTest('Invalid booking returns error', [400, 404].includes(response2.status), `Got ${response2.status}`);

    return response1.status === 401;
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  log('\n┌─────────────────────────────────────────────────────────┐', 'cyan');
  log('│          🚀 BOOKING API - FULL TEST SUITE 🚀           │', 'cyan');
  log('└─────────────────────────────────────────────────────────┘\n', 'cyan');

  log(`API Base: ${API_BASE}`, 'blue');
  log(`Start Time: ${new Date().toLocaleTimeString()}\n`, 'dim');

  const results = [];

  try {
    results.push(await testRegister());
    results.push(await testLogin());
    results.push(await testCreateBooking());
    results.push(await testGetBooking());
    results.push(await testListBookings());
    results.push(await testCancelBooking());
    results.push(await testVerifyCancellation());
    results.push(await testIdempotency());
    results.push(await testOutboxEvents());
    results.push(await testErrorHandling());
  } catch (error) {
    log(`\n✗ Test suite error: ${error.message}`, 'red');
  }

  // Summary
  logSection('📊 TEST SUMMARY');
  const passed = results.filter((r) => r).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(0);

  log(`Passed: ${passed}/${total} (${percentage}%)`, passed === total ? 'green' : 'yellow');
  log(`End Time: ${new Date().toLocaleTimeString()}\n`, 'dim');

  if (passed === total) {
    log('✓ ALL TESTS PASSED! 🎉', 'green');
  } else {
    log(`✗ ${total - passed} test(s) failed`, 'red');
  }

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch((err) => {
  log(`\n✗ Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
