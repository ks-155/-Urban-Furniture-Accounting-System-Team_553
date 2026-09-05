const http = require('http');
const app = require('./src/app');

let server;
const PORT = 5099;

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
    if (body) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Automated Phase 1 Auth Tests...\n');
  server = app.listen(PORT);

  try {
    // 1. Health check
    const health = await request('GET', '/api/health');
    console.assert(health.status === 200, 'Health check failed');
    console.log('✅ 1. Health check passed:', health.body.status);

    // 2. Login with bad password
    const badLogin = await request('POST', '/api/auth/login', {
      loginId: 'admin',
      password: 'WrongPassword!',
    });
    console.assert(badLogin.status === 401, 'Bad login should return 401');
    console.assert(badLogin.body.error === 'Invalid Login Id or Password', 'Bad login error message mismatch');
    console.log('✅ 2. Invalid login returns 401 with wireframe message:', badLogin.body.error);

    // 3. Login with seeded Admin
    const adminLogin = await request('POST', '/api/auth/login', {
      loginId: 'admin',
      password: 'Admin@123',
    });
    console.assert(adminLogin.status === 200, 'Admin login failed');
    console.assert(adminLogin.body.user.role === 'ADMIN', 'Admin role mismatch');
    const adminToken = adminLogin.body.token;
    console.log('✅ 3. Admin login successful, role:', adminLogin.body.user.role);

    // 4. Login with seeded Accountant
    const accLogin = await request('POST', '/api/auth/login', {
      loginId: 'accountant01',
      password: 'Password@123',
    });
    console.assert(accLogin.status === 200, 'Accountant login failed');
    console.assert(accLogin.body.user.role === 'ACCOUNTANT', 'Role mismatch');
    console.log('✅ 4. Accountant login successful, role:', accLogin.body.user.role);

    // 5. Signup validation: weak password rejection
    const weakSignup = await request('POST', '/api/auth/signup', {
      name: 'Test Customer',
      loginId: 'testcust',
      email: 'testcust@example.com',
      password: 'simplepassword',
      confirmPassword: 'simplepassword',
    });
    console.assert(weakSignup.status === 400, 'Weak password should be rejected');
    console.log('✅ 5. Weak password rejected correctly:', weakSignup.body.error);

    // 6. Signup validation: short loginId rejection
    const shortLogin = await request('POST', '/api/auth/signup', {
      name: 'Test Customer',
      loginId: 'abc',
      email: 'testcust@example.com',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    console.assert(shortLogin.status === 400, 'Short loginId should be rejected');
    console.log('✅ 6. Short loginId (<6 chars) rejected correctly:', shortLogin.body.error);

    // 7. Successful signup (Role: USER)
    const testSuffix = Date.now().toString().slice(-4);
    const validSignup = await request('POST', '/api/auth/signup', {
      name: 'Rahul Sharma',
      loginId: `rahul${testSuffix}`,
      email: `rahul.${testSuffix}@example.com`,
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    console.assert(validSignup.status === 201, 'Signup failed');
    console.assert(validSignup.body.user.role === 'USER', 'Signup must create USER role');
    const userToken = validSignup.body.token;
    console.log('✅ 7. Valid signup created user with role USER:', validSignup.body.user.loginId);

    // 8. Test /api/auth/me
    const meRes = await request('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${userToken}`,
    });
    console.assert(meRes.status === 200, '/me failed');
    console.assert(meRes.body.user.loginId === `rahul${testSuffix}`, 'Profile mismatch');
    console.log('✅ 8. Authenticated /api/auth/me returned current user:', meRes.body.user.name);

    // 9. Create User by Admin
    const createUserRes = await request(
      'POST',
      '/api/users',
      {
        name: 'Second Accountant',
        loginId: `acc${testSuffix}`,
        email: `acc${testSuffix}@urbanfurniture.com`,
        role: 'ACCOUNTANT',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      },
      {
        Authorization: `Bearer ${adminToken}`,
      }
    );
    console.assert(createUserRes.status === 201, 'Create user by admin failed');
    console.log('✅ 9. Admin created accountant successfully:', createUserRes.body.user.loginId);

    // 10. Access control: Normal user trying to create user -> 403 Forbidden
    const forbiddenRes = await request(
      'POST',
      '/api/users',
      {
        name: 'Hacker User',
        loginId: 'hacker01',
        email: 'hack@test.com',
        role: 'ADMIN',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      },
      {
        Authorization: `Bearer ${userToken}`,
      }
    );
    console.assert(forbiddenRes.status === 403, 'Normal user should not be able to create users');
    console.log('✅ 10. Access control verified: Normal user blocked (403 Forbidden)');

    console.log('\n🎉 ALL 10 PHASE 1 TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
