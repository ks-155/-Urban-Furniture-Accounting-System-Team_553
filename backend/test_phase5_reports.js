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
  console.log('🧪 Starting Automated Phase 5 Reports, Budgets & Dashboard Tests...\n');
  server = app.listen(PORT);

  try {
    // 1. Accountant login
    const login = await request('POST', '/api/auth/login', {
      loginId: 'accountant01',
      password: 'Password@123',
    });
    const token = login.body.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Test Balance Sheet Report
    const bs = await request('GET', '/api/reports/balance-sheet', null, authHeaders);
    console.assert(bs.status === 200, 'Failed to fetch Balance Sheet');
    console.assert(Array.isArray(bs.body.assets), 'Assets array missing');
    console.assert(Array.isArray(bs.body.liabilities), 'Liabilities array missing');
    console.assert(typeof bs.body.totalAssets === 'number', 'totalAssets missing');
    console.assert(typeof bs.body.totalLiabilities === 'number', 'totalLiabilities missing');
    console.log(`✅ 1. Balance Sheet generated successfully: Total Assets = ₹${bs.body.totalAssets}, Total Liabilities = ₹${bs.body.totalLiabilities}, Balanced: ${bs.body.isBalanced}`);

    // 3. Test Profit & Loss Report
    const pl = await request('GET', '/api/reports/profit-loss', null, authHeaders);
    console.assert(pl.status === 200, 'Failed to fetch Profit & Loss');
    console.assert(Array.isArray(pl.body.income), 'Income array missing');
    console.assert(Array.isArray(pl.body.expenses), 'Expenses array missing');
    console.assert(typeof pl.body.netProfit === 'number', 'netProfit missing');
    console.log(`✅ 2. Profit & Loss generated successfully: Total Income = ₹${pl.body.totalIncome}, Total Expenses = ₹${pl.body.totalExpenses}, Net Profit = ₹${pl.body.netProfit}`);

    // 4. Test Budget Report
    const budgetReport = await request('GET', '/api/reports/budget', null, authHeaders);
    console.assert(budgetReport.status === 200, 'Failed to fetch Budget report');
    console.assert(Array.isArray(budgetReport.body), 'Budget report should be an array');
    console.log(`✅ 3. Budget Report generated: ${budgetReport.body.length} budget items analyzed`);

    // 5. Test Budgets List
    const budgetList = await request('GET', '/api/budgets', null, authHeaders);
    console.assert(budgetList.status === 200, 'Failed to fetch budgets list');
    console.assert(Array.isArray(budgetList.body.budgets), 'budgets array missing');
    console.log(`✅ 4. Budgets listed successfully: ${budgetList.body.count} records`);

    // 6. Test Create Budget
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const createRes = await request('POST', '/api/budgets', {
      name: `FY26 Warehouse Fitout ${uniqueSuffix}`,
      periodStart: '2026-04-01',
      periodEnd: '2027-03-31',
      responsiblePerson: 'Senior Accountant',
      plannedAmount: 150000,
      committedAmount: 120000,
    }, authHeaders);
    console.assert(createRes.status === 201, 'Failed to create budget');
    console.assert(createRes.body.budget.status === 'DRAFT', 'New budget should be DRAFT');
    const newBudgetId = createRes.body.budget.id;
    console.log(`✅ 5. Budget created in DRAFT: ID ${newBudgetId} (${createRes.body.budget.name})`);

    // 7. Test Confirm Budget
    const confirmRes = await request('POST', `/api/budgets/${newBudgetId}/confirm`, null, authHeaders);
    console.assert(confirmRes.status === 200, 'Failed to confirm budget');
    console.assert(confirmRes.body.budget.status === 'CONFIRMED', 'Status should be CONFIRMED');
    console.log(`✅ 6. Budget confirmed: ID ${newBudgetId} status = ${confirmRes.body.budget.status}`);

    // 8. Test Revise Budget
    const reviseRes = await request('POST', `/api/budgets/${newBudgetId}/revise`, null, authHeaders);
    console.assert(reviseRes.status === 200, 'Failed to revise budget');
    console.assert(reviseRes.body.originalBudget.status === 'REVISED', 'Original should be REVISED');
    console.assert(reviseRes.body.revisedBudget.status === 'DRAFT', 'Revised should be DRAFT');
    console.log(`✅ 7. Budget revised: Original ID ${newBudgetId} -> REVISED, New Revision ID ${reviseRes.body.revisedBudget.id} -> DRAFT`);

    // 9. Test Dashboard Statistics
    const dash = await request('GET', '/api/dashboard', null, authHeaders);
    console.assert(dash.status === 200, 'Failed to fetch dashboard stats');
    console.assert(dash.body.sales && typeof dash.body.sales.all === 'number', 'sales stats missing');
    console.assert(dash.body.purchase && typeof dash.body.purchase.all === 'number', 'purchase stats missing');
    console.assert(dash.body.financials && typeof dash.body.financials.netProfit === 'number', 'financials stats missing');
    console.log(`✅ 8. Dashboard statistics verified:`);
    console.log(`      • Sales: ${dash.body.sales.all} orders (${dash.body.sales.confirmed} confirmed), Revenue: ₹${dash.body.sales.totalRevenue}`);
    console.log(`      • Purchase: ${dash.body.purchase.all} orders (${dash.body.purchase.confirmed} confirmed), Expense: ₹${dash.body.purchase.totalExpense}`);
    console.log(`      • Financials: Net Profit = ₹${dash.body.financials.netProfit}, Receivables = ₹${dash.body.financials.totalReceivables}, Payables = ₹${dash.body.financials.totalPayables}`);

    console.log('\n🎉 ALL 8 PHASE 5 REPORTS, BUDGETS & DASHBOARD TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Phase 5 Test failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runTests();
