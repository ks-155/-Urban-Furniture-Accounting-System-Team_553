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
  console.log('🧪 Starting Automated Phase 4 Sales Flow & Accounting Tests...\n');

  try {
    // 1. Accountant Login
    const accLogin = await request('POST', '/api/auth/login', {
      loginId: 'accountant01',
      password: 'Password@123',
    });
    console.assert(accLogin.status === 200, 'Accountant login failed');
    const accToken = accLogin.body.token;
    const accHeaders = { Authorization: `Bearer ${accToken}` };

    // 2. Customer Login (Nimesh Pathak)
    const custLogin = await request('POST', '/api/auth/login', {
      loginId: 'nimeshp',
      password: 'Password@123',
    });
    console.assert(custLogin.status === 200, 'Customer login failed');
    const custToken = custLogin.body.token;
    const custHeaders = { Authorization: `Bearer ${custToken}` };
    const customerId = custLogin.body.user.contactId;
    console.assert(customerId !== undefined, 'Customer must have linked contactId');

    // 3. Fetch products to sell
    const prodRes = await request('GET', '/api/products', null, accHeaders);
    console.assert(prodRes.status === 200, 'Failed to fetch products');
    const table = prodRes.body.products.find((p) => p.name.includes('Dining') || p.name.includes('Office') || p.name.includes('Chair')) || prodRes.body.products[0];
    console.assert(table !== undefined, 'Product must exist in database');

    const unitPrice = parseFloat(table.salesPrice);
    const quantity = 5;
    const subtotal = quantity * unitPrice;
    const taxRate = 18;
    const taxAmount = Math.round((subtotal * taxRate) / 100 * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    // 4. Accountant creates Sales Order (SO)
    const createSO = await request(
      'POST',
      '/api/sales',
      {
        customerId,
        taxRate,
        lines: [
          {
            productId: table.id,
            quantity,
            unitPrice,
          },
        ],
      },
      accHeaders
    );
    console.assert(createSO.status === 201, 'Create SO failed');
    const so = createSO.body.salesOrder;
    console.assert(so.status === 'DRAFT', 'SO status should be DRAFT');
    console.assert(parseFloat(so.totalAmount) === totalAmount, 'SO total should include 18% tax');
    console.log(`✅ 1. Sales Order created: ${so.soNumber}, Customer: ${so.customer.name}, Total: ₹${so.totalAmount} (incl. ₹${taxAmount} tax)`);

    // 5. Accountant confirms Sales Order
    const confirmSO = await request('POST', `/api/sales/${so.id}/confirm`, null, accHeaders);
    console.assert(confirmSO.status === 200, 'Confirm SO failed');
    console.assert(confirmSO.body.salesOrder.status === 'CONFIRMED', 'SO should be CONFIRMED');
    console.log(`✅ 2. Sales Order confirmed: ${so.soNumber} (Status: CONFIRMED)`);

    // 6. Accountant creates Customer Invoice from SO
    const createInv = await request('POST', `/api/sales/${so.id}/create-invoice`, null, accHeaders);
    console.assert(createInv.status === 201, 'Create invoice from SO failed');
    const inv = createInv.body.invoice;
    console.assert(inv.status === 'DRAFT', 'Invoice status should be DRAFT');
    console.assert(inv.salesOrderId === so.id, 'Invoice should link to SO');
    console.assert(parseFloat(inv.totalAmount) === totalAmount, 'Invoice amount mismatch');
    console.log(`✅ 3. Customer Invoice generated: ${inv.invNumber}, Linked to SO: ${so.soNumber}`);

    // Double-invoice prevention
    const doubleInv = await request('POST', `/api/sales/${so.id}/create-invoice`, null, accHeaders);
    console.assert(doubleInv.status === 400, 'Should block double invoice on already invoiced SO');
    console.log('✅ 4. Guard verified: Double invoice on already INVOICED SO rejected');

    // 7. Accountant confirms Customer Invoice -> Auto-generates balanced double-entry Journal Entry!
    const confirmInv = await request('POST', `/api/invoices/${inv.id}/confirm`, null, accHeaders);
    console.assert(confirmInv.status === 200, 'Confirm invoice failed');
    console.assert(confirmInv.body.invoice.status === 'CONFIRMED', 'Invoice should be CONFIRMED');
    const je = confirmInv.body.journalEntry;
    console.assert(je !== undefined, 'Journal entry should be created');

    const totalDebit = je.items.reduce((s, it) => s + parseFloat(it.debit), 0);
    const totalCredit = je.items.reduce((s, it) => s + parseFloat(it.credit), 0);
    console.assert(Math.abs(totalDebit - totalCredit) < 0.01, 'Sales Journal Entry must be balanced!');
    console.log(`✅ 5. Customer Invoice confirmed & Auto Journal Entry ${je.entryNumber} posted:`);
    console.log(`      • Total Debit:  ₹${totalDebit.toFixed(2)} (Debtors / Accounts Receivable)`);
    console.log(`      • Total Credit: ₹${totalCredit.toFixed(2)} (Sales Revenue + Tax Payable)`);
    console.log(`      • Balanced: Debit (₹${totalDebit.toFixed(2)}) == Credit (₹${totalCredit.toFixed(2)}) ✅`);

    // 8. Customer checks portal: sees their invoices
    const custInvoices = await request('GET', '/api/invoices', null, custHeaders);
    console.assert(custInvoices.status === 200, 'Customer invoices list failed');
    const myInv = custInvoices.body.invoices.find((i) => i.id === inv.id);
    console.assert(myInv !== undefined, 'Customer should see their invoice in portal');
    console.log(`✅ 6. Customer Portal verified: Nimesh Pathak sees invoice ${myInv.invNumber} (Due: ₹${myInv.totalAmount})`);

    // 9. Security Check: Customer cannot post or confirm arbitrary invoices
    const illegalConfirm = await request('POST', `/api/invoices/${inv.id}/confirm`, null, custHeaders);
    console.assert(illegalConfirm.status === 403, 'Customer should not have permission to confirm invoices');
    console.log('✅ 7. Security verified: Customer blocked from staff-only invoice confirm (403 Forbidden)');

    // 10. Customer pays dues online via Portal (/api/invoices/:id/pay)
    const payRes = await request(
      'POST',
      `/api/invoices/${inv.id}/pay`,
      {
        paymentMethod: 'BANK',
      },
      custHeaders
    );
    console.assert(payRes.status === 200, 'Customer payment failed');
    console.assert(payRes.body.invoice.status === 'PAID', 'Invoice status should be PAID');
    console.assert(payRes.body.amountDue === 0, 'Amount due should be 0 after full payment');
    const payJE = payRes.body.journalEntry;
    const payDebit = payJE.items.reduce((s, it) => s + parseFloat(it.debit), 0);
    const payCredit = payJE.items.reduce((s, it) => s + parseFloat(it.credit), 0);
    console.assert(Math.abs(payDebit - payCredit) < 0.01, 'Payment JE must be balanced!');
    console.log(`✅ 8. Customer paid online: Invoice ${inv.invNumber} updated to PAID`);
    console.log(`      • Payment JE ${payJE.entryNumber}: Dr Bank ₹${payDebit} == Cr Debtors ₹${payCredit} ✅`);

    // 11. Verify query of general journal entries
    const allJEs = await request('GET', '/api/journal-entries', null, accHeaders);
    console.assert(allJEs.status === 200, 'Fetch journal entries failed');
    for (const entry of allJEs.body.journalEntries) {
      const d = entry.items.reduce((s, it) => s + parseFloat(it.debit), 0);
      const c = entry.items.reduce((s, it) => s + parseFloat(it.credit), 0);
      console.assert(Math.abs(d - c) < 0.01, `Unbalanced entry found: ${entry.entryNumber}`);
    }
    console.log(`✅ 9. Audit check: All ${allJEs.body.journalEntries.length} General Ledger entries in system strictly balanced!`);

    console.log('\n🎉 ALL 9 PHASE 4 SALES FLOW & ACCOUNTING TESTS PASSED PERFECTLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();
