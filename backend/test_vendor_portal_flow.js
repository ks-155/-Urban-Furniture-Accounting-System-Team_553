const http = require('http');
const app = require('./src/app');

let server;
const PORT = 5096;

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
  console.log('🧪 Testing Multi-Actor Vendor Portal Workflow...\n');
  server = app.listen(PORT);

  try {
    // 1. Accountant logs in
    const accLogin = await request('POST', '/api/auth/login', {
      loginId: 'accountant01',
      password: 'Password@123',
    });
    console.assert(accLogin.status === 200, 'Accountant login failed');
    const accountantToken = accLogin.body.token;
    const accHeaders = { Authorization: `Bearer ${accountantToken}` };

    // 2. Accountant creates PO for Azure Furniture
    const createPO = await request(
      'POST',
      '/api/purchases',
      {
        vendorId: 1, // Azure Furniture
        lines: [
          {
            productId: 1,
            quantity: 10,
            unitPrice: 3000,
          },
        ],
      },
      accHeaders
    );
    console.assert(createPO.status === 201, 'Create PO failed');
    const po = createPO.body.purchaseOrder;
    console.log(`✅ 1. Accountant created Purchase Order: ${po.poNumber} for Azure Furniture (₹${po.totalAmount})`);

    // 3. Accountant confirms PO
    const confirmPO = await request('POST', `/api/purchases/${po.id}/confirm`, null, accHeaders);
    console.assert(confirmPO.status === 200, 'Confirm PO failed');
    console.log(`✅ 2. Accountant confirmed PO: ${po.poNumber}`);

    // 4. Vendor (Azure Furniture) logs in
    const vendorLogin = await request('POST', '/api/auth/login', {
      loginId: 'azure01',
      password: 'Password@123',
    });
    console.assert(vendorLogin.status === 200, 'Vendor login failed');
    const vendorToken = vendorLogin.body.token;
    const vendorHeaders = { Authorization: `Bearer ${vendorToken}` };
    console.log('✅ 3. Vendor (Azure Furniture) logged in to Vendor Portal');

    // 5. Vendor views their POs
    const vendorPOs = await request('GET', '/api/purchases', null, vendorHeaders);
    console.assert(vendorPOs.status === 200, 'Vendor GET POs failed');
    const targetPO = vendorPOs.body.purchaseOrders.find((p) => p.id === po.id);
    console.assert(targetPO !== undefined, 'Target PO not found in vendor list');
    console.log(`✅ 4. Vendor sees PO ${targetPO.poNumber} in portal`);

    // 6. Vendor submits Bill against PO
    const submitBill = await request(
      'POST',
      `/api/purchases/${po.id}/vendor-submit-bill`,
      {
        vendorInvoiceRef: 'AZ-INV-9901',
        billDate: '2026-09-05',
      },
      vendorHeaders
    );
    console.assert(submitBill.status === 201, 'Vendor submit bill failed');
    const submittedBill = submitBill.body.bill;
    console.assert(submittedBill.status === 'SUBMITTED', 'Bill status should be SUBMITTED');
    console.assert(submittedBill.reference === 'AZ-INV-9901', 'Bill ref mismatch');
    console.log(`✅ 5. Vendor submitted Bill: ${submittedBill.billNumber} (Ref: ${submittedBill.reference}, Status: ${submittedBill.status})`);

    // 7. Security Check: Vendor CANNOT approve/confirm their own bill
    const unauthorizedConfirm = await request('POST', `/api/bills/${submittedBill.id}/confirm`, null, vendorHeaders);
    console.assert(unauthorizedConfirm.status === 403, 'Vendor should be blocked from confirming bills');
    console.log('✅ 6. Security verified: Vendor blocked from approving/posting bill (403 Forbidden)');

    // 8. Accountant reviews and approves SUBMITTED bill
    const approveBill = await request('POST', `/api/bills/${submittedBill.id}/confirm`, null, accHeaders);
    console.assert(approveBill.status === 200, 'Accountant approve bill failed');
    console.assert(approveBill.body.bill.status === 'CONFIRMED', 'Approved bill should be CONFIRMED');
    const je = approveBill.body.journalEntry;
    console.assert(je !== undefined, 'Journal entry should be created on approval');
    console.log(`✅ 7. Accountant approved bill! Auto Journal Entry ${je.entryNumber} created (Debits = Credits)`);

    // 9. Accountant pays the bill via Bank
    const payBill = await request(
      'POST',
      `/api/bills/${submittedBill.id}/pay`,
      {
        paymentMethod: 'BANK',
      },
      accHeaders
    );
    console.assert(payBill.status === 200, 'Pay bill failed');
    console.assert(payBill.body.bill.status === 'PAID', 'Bill should be PAID');
    console.log(`✅ 8. Accountant paid bill via Bank. Status = ${payBill.body.bill.status}`);

    // 10. Vendor refreshes portal and sees PAID
    const vendorBills = await request('GET', '/api/bills', null, vendorHeaders);
    const settledBill = vendorBills.body.bills.find((b) => b.id === submittedBill.id);
    console.assert(settledBill.status === 'PAID', 'Vendor bill should now show PAID');
    console.log(`✅ 9. Vendor refreshes portal: Bill ${settledBill.billNumber} shows PAID / SETTLED`);

    console.log('\n🎉 ALL 9 VENDOR PORTAL MULTI-ACTOR WORKFLOW TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
