// Unified test runner for Urban Furniture Accounting System
// Executes all 8 test suites sequentially and reports summary

const { spawn } = require('child_process');
const path = require('path');

const testSuites = [
  'test_auth.js',
  'test_master_data.js',
  'test_purchase_flow.js',
  'test_vendor_portal_flow.js',
  'test_sales_flow.js',
  'test_payments.js',
  'test_phase5_reports.js',
  'test_customer_self_order_flow.js',
];

console.log('====================================================');
console.log('  Urban Furniture Accounting - Automated Test Suite');
console.log('====================================================\n');

async function runTest(file) {
  return new Promise((resolve) => {
    const filePath = path.join(__dirname, file);
    const start = Date.now();
    const proc = spawn(process.execPath, [filePath], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      resolve({
        file,
        passed: code === 0,
        code,
        duration,
        stdout,
        stderr,
      });
    });
  });
}

async function runAll() {
  let passedCount = 0;
  let failedCount = 0;

  for (const suite of testSuites) {
    process.stdout.write(`Running ${suite.padEnd(38)} ... `);
    const result = await runTest(suite);
    if (result.passed) {
      passedCount++;
      console.log(`✅ PASS (${result.duration}s)`);
    } else {
      failedCount++;
      console.log(`❌ FAIL (${result.duration}s)`);
      if (result.stderr || result.stdout) {
        console.log('   --- Output ---');
        console.log((result.stderr || result.stdout).split('\n').slice(-10).map(l => '   ' + l).join('\n'));
      }
    }
  }

  console.log('\n----------------------------------------------------');
  console.log(`Total Suites: ${testSuites.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log('----------------------------------------------------');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL TEST SUITES PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
