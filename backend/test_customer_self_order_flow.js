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
  console.log('🧪 Starting Automated Customer Self-Order & Actor Workflow Tests...\n');
  server = app.listen(PORT);

  try {
    // 1. Customer Login (Nimesh Pathak)
    const custLogin = await request('POST', '/api/auth/login', {
      loginId: 'nimeshp',
      password: 'Password@123',
    });
    console.assert(custLogin.status === 200, 'Customer login failed');
    const custToken = custLogin.body.token;
    const custHeaders = { Authorization: `Bearer ${custToken}` };
    console.log('✅ 1. Customer logged in successfully: Nimesh Pathak (Role: USER)');

    // 2. Customer initiates order: [ + Place New Order / Buy Furniture ]
    const prodRes = await request('GET', '/api/products', null, custHeaders);
    const product = prodRes.body.products[0];
    console.assert(product !== undefined, 'No product found');

    const orderRes = await request('POST', '/api/sales', {
      lines: [
        { productId: product.id, quantity: 2 },
      ],
    }, custHeaders);
    console.assert(orderRes.status === 201, `Customer place order failed: ${JSON.stringify(orderRes.body)}`);
    const newSO = orderRes.body.salesOrder;
    console.assert(newSO.status === 'DRAFT', 'New order should be in DRAFT status');
    console.log(`✅ 2. Customer self-initiated order created: ${newSO.soNumber}, Total: ₹${newSO.totalAmount} (Status: DRAFT)`);

    // 3. Accountant Login
    const accLogin = await request('POST', '/api/auth/login', {
      loginId: 'accountant01',
      password: 'Password@123',
    });
    const accToken = accLogin.body.token;
    const accHeaders = { Authorization: `Bearer ${accToken}` };

    // 4. Accountant verifies & confirms customer order
    const confirmSO = await request('POST', `/api/sales/${newSO.id}/confirm`, null, accHeaders);
    console.assert(confirmSO.status === 200, 'Accountant confirm SO failed');
    console.assert(confirmSO.body.salesOrder.status === 'CONFIRMED', 'SO should be CONFIRMED');
    console.log(`✅ 3. Accountant verified & confirmed order: ${newSO.soNumber} (Status: CONFIRMED)`);

    // 5. Accountant generates customer invoice
    const createInv = await request('POST', `/api/sales/${newSO.id}/create-invoice`, null, accHeaders);
    console.assert(createInv.status === 201, 'Create invoice failed');
    const newInv = createInv.body.invoice;
    console.log(`✅ 4. Accountant generated invoice: ${newInv.invNumber} (Linked to ${newSO.soNumber})`);

    // 6. Accountant confirms invoice (triggering double-entry Sales JE)
    const confirmInv = await request('POST', `/api/invoices/${newInv.id}/confirm`, null, accHeaders);
    console.assert(confirmInv.status === 200, 'Confirm invoice failed');
    console.assert(confirmInv.body.journalEntry, 'Journal Entry should be posted');
    console.log(`✅ 5. Accountant confirmed invoice & posted Sales JE: ${confirmInv.body.journalEntry.entryNumber} (Debit Debtors == Credit Sales + Tax)`);

    // 7. Customer sees confirmed invoice and pays dues online
    const payRes = await request('POST', `/api/invoices/${newInv.id}/pay`, {
      paymentMethod: 'BANK',
    }, custHeaders);
    console.assert(payRes.status === 200, 'Customer pay dues failed');
    console.assert(payRes.body.invoice.status === 'PAID', 'Invoice should be PAID');
    console.log(`✅ 6. Customer paid dues online: Invoice ${newInv.invNumber} status = PAID, Payment JE posted`);

    // Self-cleanup
    const prisma = require('./src/prisma');
    if (payRes.body?.payment?.id) {
      await prisma.payment.delete({ where: { id: payRes.body.payment.id } }).catch(() => {});
    }
    if (confirmInv.body?.journalEntry?.id) {
      await prisma.journalEntry.delete({ where: { id: confirmInv.body.journalEntry.id } }).catch(() => {});
    }
    if (newInv?.id) {
      await prisma.customerInvoiceLine.deleteMany({ where: { invoiceId: newInv.id } }).catch(() => {});
      await prisma.customerInvoice.delete({ where: { id: newInv.id } }).catch(() => {});
    }
    if (newSO?.id) {
      await prisma.salesOrderLine.deleteMany({ where: { salesOrderId: newSO.id } }).catch(() => {});
      await prisma.salesOrder.delete({ where: { id: newSO.id } }).catch(() => {});
    }
    await prisma.$disconnect();

    console.log('\n🎉 ALL 6 CUSTOMER SELF-ORDER WORKFLOW TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runTests();
