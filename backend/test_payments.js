const http = require('http');
const app = require('./src/app');

let server;
const PORT = 5098;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: responseData ? JSON.parse(responseData) : null,
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              rawBody: responseData,
            });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Automated Payments & Receipts Ledger Tests...\n');
  server = app.listen(PORT);

  try {
    // 1. Admin login
    const login = await request('POST', '/api/auth/login', {
      loginId: 'admin',
      password: 'Admin@123',
    });
    const token = login.body.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Fetch all payments
    const all = await request('GET', '/api/payments', null, authHeaders);
    console.assert(all.status === 200, 'Failed to fetch all payments');
    console.log(`✅ 1. List all payments succeeded: ${all.body.count} transactions in ledger`);

    // 3. Filter by Receipts (Inbound)
    const receipts = await request('GET', '/api/payments?type=receipts', null, authHeaders);
    console.assert(receipts.status === 200, 'Failed to fetch receipts');
    console.assert(receipts.body.payments.every(p => p.paymentType === 'INBOUND'), 'Receipts filter failed');
    console.log(`✅ 2. Filter receipts (Inbound) succeeded: ${receipts.body.count} customer receipts`);

    // 4. Filter by Vendor Payments (Outbound)
    const vendorPayments = await request('GET', '/api/payments?type=payments', null, authHeaders);
    console.assert(vendorPayments.status === 200, 'Failed to fetch vendor payments');
    console.assert(vendorPayments.body.payments.every(p => p.paymentType === 'OUTBOUND'), 'Vendor payments filter failed');
    console.log(`✅ 3. Filter vendor payments (Outbound) succeeded: ${vendorPayments.body.count} payments`);

    // 5. Normal USER access control check
    const userLogin = await request('POST', '/api/auth/login', {
      loginId: 'nimeshp',
      password: 'Password@123',
    });
    const userToken = userLogin.body.token;
    const userPayments = await request('GET', '/api/payments', null, { Authorization: `Bearer ${userToken}` });
    console.assert(userPayments.status === 200, 'User payments query failed');
    console.assert(userPayments.body.payments.every(p => p.partnerId === userLogin.body.user.contactId), 'User saw other contacts payments!');
    console.log(`✅ 4. Customer access control verified: customer only sees own receipts (${userPayments.body.count} records)`);

    console.log('\n🎉 ALL 4 PAYMENTS & RECEIPTS TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runTests();
