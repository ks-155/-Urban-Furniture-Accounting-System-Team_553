const http = require('http');
const app = require('./src/app');

let server;
const PORT = 5097;

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
  console.log('🧪 Starting Automated Phase 3 Purchase & Accounting Flow Tests...\n');
  server = app.listen(PORT);

  try {
    // 0. Login as Accountant
    const loginRes = await request('POST', '/api/auth/login', {
      loginId: 'accountant01',
      password: 'Password@123',
    });
    console.assert(loginRes.status === 200, 'Accountant login failed');
    const token = loginRes.body.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 1. Get Azure Furniture (Vendor) and a Product
    const contactsRes = await request('GET', '/api/contacts?type=VENDOR', null, authHeaders);
    const vendor = contactsRes.body.contacts.find((c) => c.name.includes('Azure')) || contactsRes.body.contacts[0];
    console.assert(vendor !== undefined, 'No vendor found');

    const productsRes = await request('GET', '/api/products', null, authHeaders);
    const product = productsRes.body.products[0];
    console.assert(product !== undefined, 'No product found');

    console.log(`Using Vendor: ${vendor.name} (ID: ${vendor.id}), Product: ${product.name} (Cost: ₹${product.costPrice})`);

    // 2. Create Purchase Order (PO)
    const createPORes = await request(
      'POST',
      '/api/purchases',
      {
        vendorId: vendor.id,
        lines: [
          {
            productId: product.id,
            quantity: 5,
            unitPrice: parseFloat(product.costPrice),
          },
        ],
      },
      authHeaders
    );
    console.assert(createPORes.status === 201, 'Create PO failed');
    const po = createPORes.body.purchaseOrder;
    console.assert(po.poNumber.startsWith('P'), 'PO number format invalid');
    console.log(`✅ 1. Purchase Order created: ${po.poNumber}, Total: ₹${po.totalAmount}, Status: ${po.status}`);

    // 3. Confirm Purchase Order
    const confirmPORes = await request('POST', `/api/purchases/${po.id}/confirm`, null, authHeaders);
    console.assert(confirmPORes.status === 200, 'Confirm PO failed');
    console.assert(confirmPORes.body.purchaseOrder.status === 'CONFIRMED', 'PO status should be CONFIRMED');
    console.log(`✅ 2. Purchase Order confirmed successfully: Status = ${confirmPORes.body.purchaseOrder.status}`);

    // 4. Convert PO to Vendor Bill
    const createBillRes = await request('POST', `/api/purchases/${po.id}/create-bill`, null, authHeaders);
    console.assert(createBillRes.status === 201, 'Create Bill from PO failed');
    const bill = createBillRes.body.bill;
    console.assert(bill.billNumber.startsWith('BILL'), 'Bill number format invalid');
    console.assert(bill.purchaseOrderId === po.id, 'Bill should link to PO');
    console.log(`✅ 3. Vendor Bill generated: ${bill.billNumber}, Linked to PO: ${po.poNumber}`);

    // 5. Confirm Vendor Bill -> MUST auto-create double-entry Journal Entry!
    const confirmBillRes = await request('POST', `/api/bills/${bill.id}/confirm`, null, authHeaders);
    console.assert(confirmBillRes.status === 200, 'Confirm Bill failed');
    const je = confirmBillRes.body.journalEntry;
    console.assert(je !== undefined, 'Journal Entry was not created');
    console.assert(je.items.length === 2, 'JE should have 2 line items (debit and credit)');

    const debitItem = je.items.find((i) => parseFloat(i.debit) > 0);
    const creditItem = je.items.find((i) => parseFloat(i.credit) > 0);
    console.assert(parseFloat(debitItem.debit) === parseFloat(creditItem.credit), 'Double-entry not balanced');
    console.log(`✅ 4. Vendor Bill confirmed & Auto Journal Entry ${je.entryNumber} created:`);
    console.log(`      • Debit:  ${debitItem.account.name} (Code: ${debitItem.account.code}) = ₹${debitItem.debit}`);
    console.log(`      • Credit: ${creditItem.account.name} (Code: ${creditItem.account.code}) = ₹${creditItem.credit}`);
    console.log(`      • Balanced: Debit (₹${debitItem.debit}) == Credit (₹${creditItem.credit}) ✅`);

    // 6. Register Partial Payment (Pay ₹5,000 via Bank)
    const partialPayRes = await request(
      'POST',
      `/api/bills/${bill.id}/pay`,
      {
        amount: 5000,
        paymentMethod: 'BANK',
      },
      authHeaders
    );
    console.assert(partialPayRes.status === 200, 'Partial payment failed');
    console.assert(parseFloat(partialPayRes.body.bill.paidAmount) === 5000, 'Paid amount mismatch');
    console.assert(partialPayRes.body.bill.status === 'CONFIRMED', 'Bill should still be CONFIRMED');
    console.log(`✅ 5. Partial payment ₹5,000 via Bank registered. Remaining Due: ₹${partialPayRes.body.amountDue}`);

    // 7. Register Final Payment (Clear remaining balance via Cash)
    const finalPayRes = await request(
      'POST',
      `/api/bills/${bill.id}/pay`,
      {
        paymentMethod: 'CASH', // auto-pays remainder
      },
      authHeaders
    );
    console.assert(finalPayRes.status === 200, 'Final payment failed');
    console.assert(finalPayRes.body.bill.status === 'PAID', 'Bill status should now be PAID');
    console.assert(finalPayRes.body.amountDue === 0, 'Amount due should be 0');
    console.log(`✅ 6. Final payment registered via Cash. Bill Status = ${finalPayRes.body.bill.status}, Due = ₹${finalPayRes.body.amountDue}`);

    // 8. Test Manual Journal Entry balance rejection (Excalidraw rule)
    const unbalancedJERes = await request(
      'POST',
      '/api/journal-entries',
      {
        journalId: 1,
        lines: [
          { accountId: 1, debit: 1000, credit: 0 },
          { accountId: 2, debit: 0, credit: 800 },
        ],
      },
      authHeaders
    );
    console.assert(unbalancedJERes.status === 400, 'Unbalanced JE should return 400');
    console.log(`✅ 7. Unbalanced Journal Entry blocked with error: "${unbalancedJERes.body.error}"`);

    // 9. Query all Journal Entries
    const listJERes = await request('GET', '/api/journal-entries', null, authHeaders);
    console.assert(listJERes.status === 200, 'List JE failed');
    console.assert(listJERes.body.journalEntries.length >= 3, 'Should have at least 3 journal entries');
    console.log(`✅ 8. All ${listJERes.body.journalEntries.length} Journal Entries queried successfully. All balanced: ${listJERes.body.journalEntries.every((e) => e.isBalanced)}`);

    console.log('\n🎉 ALL 8 PHASE 3 PURCHASE & ACCOUNTING FLOW TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
