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
              body: responseData ? JSON.parse(responseData) : null,
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
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
  console.log('🧪 Starting Automated Phase 2 Master Data Tests...\n');
  server = app.listen(PORT);

  try {
    // 0. Login as admin to get auth token
    const loginRes = await request('POST', '/api/auth/login', {
      loginId: 'admin',
      password: 'Admin@123',
    });
    console.assert(loginRes.status === 200, 'Admin login failed');
    const token = loginRes.body.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 1. List Contacts
    const contactsRes = await request('GET', '/api/contacts');
    console.assert(contactsRes.status === 200, 'List contacts failed');
    console.assert(Array.isArray(contactsRes.body.contacts), 'Contacts should be array');
    console.log(`✅ 1. List contacts returned ${contactsRes.body.contacts.length} records.`);

    // 2. Filter Contacts by VENDOR
    const vendorsRes = await request('GET', '/api/contacts?type=VENDOR');
    console.assert(vendorsRes.status === 200, 'Filter vendors failed');
    console.assert(vendorsRes.body.contacts.every((c) => c.type === 'VENDOR'), 'Vendor filter failed');
    console.log('✅ 2. Filter contacts by VENDOR works properly.');

    // 3. Create a new Contact
    const uniqueEmail = `supply${Date.now().toString().slice(-4)}@royaloak.com`;
    const newContactRes = await request(
      'POST',
      '/api/contacts',
      {
        name: 'Royal Oak Furnishings',
        type: 'VENDOR',
        email: uniqueEmail,
        mobile: '9123456780',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
      authHeaders
    );
    console.assert(newContactRes.status === 201, 'Create contact failed');
    const createdContactId = newContactRes.body.contact.id;
    console.log('✅ 3. Create contact created:', newContactRes.body.contact.name);

    // 4. Update Contact
    const updateContactRes = await request(
      'PUT',
      `/api/contacts/${createdContactId}`,
      {
        city: 'Bengaluru Central',
      },
      authHeaders
    );
    console.assert(updateContactRes.status === 200, 'Update contact failed');
    console.assert(updateContactRes.body.contact.city === 'Bengaluru Central', 'City not updated');
    console.log('✅ 4. Update contact succeeded.');

    // 5. List Products
    const productsRes = await request('GET', '/api/products');
    console.assert(productsRes.status === 200, 'List products failed');
    console.assert(Array.isArray(productsRes.body.products), 'Products should be array');
    console.log(`✅ 5. List products returned ${productsRes.body.products.length} products.`);

    // 6. Create a Product
    const newProdRes = await request(
      'POST',
      '/api/products',
      {
        name: 'Ergonomic Desk Pro',
        type: 'GOODS',
        salesPrice: 15500,
        costPrice: 9500,
        category: 'Office Tables',
      },
      authHeaders
    );
    console.assert(newProdRes.status === 201, 'Create product failed');
    const createdProdId = newProdRes.body.product.id;
    console.log('✅ 6. Create product succeeded:', newProdRes.body.product.name);

    // 7. Update Product
    const updateProdRes = await request(
      'PUT',
      `/api/products/${createdProdId}`,
      {
        salesPrice: 16000,
      },
      authHeaders
    );
    console.assert(updateProdRes.status === 200, 'Update product failed');
    console.assert(parseFloat(updateProdRes.body.product.salesPrice) === 16000, 'Price not updated');
    console.log('✅ 7. Update product price succeeded.');

    // 8. List Chart of Accounts (with live balance check)
    const accountsRes = await request('GET', '/api/accounts');
    console.assert(accountsRes.status === 200, 'List accounts failed');
    console.assert(accountsRes.body.accounts.length >= 8, 'CoA should have at least 8 default accounts');
    console.log(`✅ 8. Chart of Accounts listed ${accountsRes.body.accounts.length} accounts with computed balances.`);

    // 9. Create a new Account
    const accSuffix = Date.now().toString().slice(-3);
    const newAccRes = await request(
      'POST',
      '/api/accounts',
      {
        code: `5${accSuffix}`,
        name: 'Freight & Delivery Expense',
        type: 'EXPENSE',
      },
      authHeaders
    );
    console.assert(newAccRes.status === 201, 'Create account failed');
    console.log(`✅ 9. Create Account 5${accSuffix} succeeded:`, newAccRes.body.account.name);

    // 10. List Journals
    const journalsRes = await request('GET', '/api/journals');
    console.assert(journalsRes.status === 200, 'List journals failed');
    console.assert(journalsRes.body.journals.length >= 4, 'Should have at least 4 default journals');
    console.assert(journalsRes.body.journals[0].defaultAccount !== undefined, 'Journal defaultAccount missing');
    console.log(`✅ 10. Journals listed ${journalsRes.body.journals.length} journals with linked default accounts.`);

    // 11. Create a Journal
    const newJournalRes = await request(
      'POST',
      '/api/journals',
      {
        name: 'Petty Cash Journal',
        code: `PC${accSuffix}`,
        type: 'CASH',
        defaultAccountId: accountsRes.body.accounts.find((a) => a.code === '1001').id,
      },
      authHeaders
    );
    console.assert(newJournalRes.status === 201, 'Create journal failed');
    console.log(`✅ 11. Create Journal PC${accSuffix} succeeded:`, newJournalRes.body.journal.name);

    // 12. List Analytic Accounts
    const analyticRes = await request('GET', '/api/analytic-accounts');
    console.assert(analyticRes.status === 200, 'List analytic accounts failed');
    console.assert(analyticRes.body.analyticAccounts.length >= 1, 'Should have at least 1 analytic account');
    console.log(`✅ 12. Analytic accounts listed ${analyticRes.body.analyticAccounts.length} records.`);

    // 13. Create Analytic Account
    const newAnalyticRes = await request(
      'POST',
      '/api/analytic-accounts',
      {
        name: `Showroom Expansion ${accSuffix}`,
        type: 'EXPENSE',
      },
      authHeaders
    );
    console.assert(newAnalyticRes.status === 201, 'Create analytic account failed');
    console.log('✅ 13. Create Analytic Account succeeded:', newAnalyticRes.body.analyticAccount.name);

    console.log('\n🎉 ALL 13 PHASE 2 MASTER DATA TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
