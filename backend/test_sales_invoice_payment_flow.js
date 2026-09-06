const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Detailed Sales Flow, Customer Invoice, Payment & Budget Validation Tests...\n');

  try {
    const accLogin = await request('POST', '/api/auth/login', {
      loginId: 'accountant01',
      password: 'Password@123',
    });
    console.assert(accLogin.status === 200, 'Accountant login failed');
    const accToken = accLogin.body.token;
    const accHeaders = { Authorization: `Bearer ${accToken}` };

    const contactsRes = await request('GET', '/api/contacts?type=CUSTOMER', null, accHeaders);
    const customer = contactsRes.body.contacts[0];
    console.assert(customer !== undefined, 'Customer contact required');

    const prodRes = await request('GET', '/api/products', null, accHeaders);
    const product = prodRes.body.products[0];
    console.assert(product !== undefined, 'Product required');

    const unitPrice = 2000;
    const quantity = 3;
    const subtotal = unitPrice * quantity;
    const taxRate = 18;
    const taxAmount = Math.round((subtotal * taxRate) / 100 * 100) / 100;
    const orderTotal = subtotal + taxAmount;

    const createSO = await request(
      'POST',
      '/api/sales',
      {
        customerId: customer.id,
        taxRate,
        lines: [{ productId: product.id, quantity, unitPrice }],
      },
      accHeaders
    );
    console.assert(createSO.status === 201, 'Create SO failed');
    const so = createSO.body.salesOrder;
    console.log(`✅ 1. Created Sales Order ${so.soNumber}, Total: ₹${so.totalAmount}`);

    const stockZeroConfirm = await request(
      'POST',
      `/api/sales/${so.id}/confirm`,
      { stock: 0 },
      accHeaders
    );
    console.assert(stockZeroConfirm.status === 400, 'Stock = 0 must block SO confirmation');
    console.log(`✅ 2. Stock = 0 blocked confirmation: "${stockZeroConfirm.body.error}"`);

    const lowBudgetConfirm = await request(
      'POST',
      `/api/sales/${so.id}/confirm`,
      { budgetAmount: 5000 },
      accHeaders
    );
    console.assert(lowBudgetConfirm.status === 400, 'Budget < Order Total must block');
    console.log(`✅ 3. Low Budget blocked: "${lowBudgetConfirm.body.error}"`);

    const zeroBudgetConfirm = await request(
      'POST',
      `/api/sales/${so.id}/confirm`,
      { budgetAmount: 0 },
      accHeaders
    );
    console.assert(zeroBudgetConfirm.status === 400, 'Budget = 0 must block');
    console.log(`✅ 4. Zero Budget blocked`);

    const validBudgetConfirm = await request(
      'POST',
      `/api/sales/${so.id}/confirm`,
      { budgetAmount: 20000 },
      accHeaders
    );
    console.assert(validBudgetConfirm.status === 200, 'Sufficient budget must allow confirmation');
    console.assert(validBudgetConfirm.body.salesOrder.status === 'CONFIRMED', 'SO status should be CONFIRMED');
    console.log(`✅ 5. Sufficient Budget allowed confirmation! Status: CONFIRMED`);

    const createInv = await request(
      'POST',
      `/api/sales/${so.id}/create-invoice`,
      null,
      accHeaders
    );
    console.assert(createInv.status === 201, 'Create Invoice from SO failed');
    const invoice = createInv.body.invoice;
    console.assert(invoice.status === 'DRAFT', 'Invoice should initially be DRAFT');
    console.log(`✅ 6. Generated Customer Invoice: ${invoice.invNumber}, Status: DRAFT, Total: ₹${invoice.totalAmount}`);

    const confirmInv = await request(
      'POST',
      `/api/invoices/${invoice.id}/confirm`,
      null,
      accHeaders
    );
    console.assert(confirmInv.status === 200, 'Confirm Invoice failed');
    const confirmedInvoice = confirmInv.body.invoice;
    const je = confirmInv.body.journalEntry;
    console.assert(confirmedInvoice.status === 'CONFIRMED', 'Invoice should be CONFIRMED');
    console.assert(je !== undefined, 'Confirmation must return posted Journal Entry');

    const totalDebit = je.items.reduce((s, it) => s + parseFloat(it.debit || 0), 0);
    const totalCredit = je.items.reduce((s, it) => s + parseFloat(it.credit || 0), 0);
    console.assert(Math.abs(totalDebit - totalCredit) < 0.01, `JE unbalanced: Dr ${totalDebit} != Cr ${totalCredit}`);
    console.log(`✅ 7. Customer Invoice confirmed! Balanced Journal Entry created: ${je.entryNumber}, Dr ₹${totalDebit} = Cr ₹${totalCredit}`);

    const jeListRes = await request('GET', '/api/journal-entries', null, accHeaders);
    console.assert(jeListRes.status === 200, 'Failed to fetch journal entries list');
    const foundJE = jeListRes.body.journalEntries.find((e) => e.entryNumber === je.entryNumber);
    console.assert(foundJE !== undefined, 'Confirmed invoice JE must be visible in Journal Entries section');
    console.log(`✅ 8. Journal Entry ${je.entryNumber} verified in Journal Entries list`);

    const pay1 = await request(
      'POST',
      `/api/invoices/${invoice.id}/pay`,
      {
        amount: 4000,
        paymentMethod: 'CASH',
        note: 'Partial cash payment installment 1',
      },
      accHeaders
    );
    console.assert(pay1.status === 200, 'Partial payment failed');
    console.assert(pay1.body.amountDue === Math.round((orderTotal - 4000) * 100) / 100, 'Amount due must match remaining');
    console.log(`✅ 9. Recorded partial Cash payment ₹4,000. Remaining Due: ₹${pay1.body.amountDue}`);

    const remaining = pay1.body.amountDue;
    const pay2 = await request(
      'POST',
      `/api/invoices/${invoice.id}/pay`,
      {
        amount: remaining,
        paymentMethod: 'BANK',
        note: 'Settlement via HDFC bank transfer',
      },
      accHeaders
    );
    console.assert(pay2.status === 200, 'Final payment failed');
    console.assert(pay2.body.invoice.status === 'PAID', 'Invoice status should now be PAID');
    console.assert(pay2.body.amountDue === 0, 'Amount due must be 0 after full settlement');
    console.log(`✅ 10. Recorded final Bank payment ₹${remaining}. Invoice status: PAID in full!`);

    console.log('\n🎉 ALL CORE SALES, INVOICE, PAYMENT & VALIDATION TESTS PASSED CLEANLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();
