const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // 1. Seed Chart of Accounts
  console.log('Seeding Chart of Accounts...');
  const accountsData = [
    { code: '1001', name: 'Cash on Hand', type: 'ASSET' },
    { code: '1002', name: 'Bank Account', type: 'ASSET' },
    { code: '1003', name: 'Debtors (Accounts Receivable)', type: 'ASSET' },
    { code: '2001', name: 'Creditors (Accounts Payable)', type: 'LIABILITY' },
    { code: '2002', name: 'Tax Payable', type: 'LIABILITY' },
    { code: '3001', name: 'Owner Capital', type: 'CAPITAL' },
    { code: '4001', name: 'Sales Income', type: 'INCOME' },
    { code: '5001', name: 'Purchase Expense', type: 'EXPENSE' },
  ];

  const accounts = {};
  for (const acc of accountsData) {
    accounts[acc.code] = await prisma.account.upsert({
      where: { code: acc.code },
      update: {},
      create: acc,
    });
  }

  // 2. Seed Default Journals
  console.log('Seeding Journals...');
  const journalsData = [
    { name: 'Sales Journal', code: 'SALES', type: 'SALES', defaultAccountId: accounts['4001'].id },
    { name: 'Purchase Journal', code: 'PURCH', type: 'PURCHASE', defaultAccountId: accounts['5001'].id },
    { name: 'Bank Journal', code: 'BANK', type: 'BANK', defaultAccountId: accounts['1002'].id },
    { name: 'Cash Journal', code: 'CASH', type: 'CASH', defaultAccountId: accounts['1001'].id },
  ];

  for (const j of journalsData) {
    await prisma.journal.upsert({
      where: { code: j.code },
      update: { defaultAccountId: j.defaultAccountId },
      create: j,
    });
  }

  // 3. Seed Users
  console.log('Seeding Users...');
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const accountantPassword = await bcrypt.hash('Password@123', 10);

  await prisma.user.upsert({
    where: { loginId: 'admin' },
    update: {},
    create: {
      loginId: 'admin',
      name: 'System Administrator',
      email: 'admin@urbanfurniture.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { loginId: 'accountant01' },
    update: {},
    create: {
      loginId: 'accountant01',
      name: 'Senior Accountant',
      email: 'accountant@urbanfurniture.com',
      password: accountantPassword,
      role: 'ACCOUNTANT',
    },
  });

  // 4. Seed Contacts
  console.log('Seeding Master Contacts...');
  const vendorAzure = await prisma.contact.upsert({
    where: { email: 'azure@furniture.com' },
    update: {},
    create: {
      name: 'Azure Furniture',
      type: 'VENDOR',
      email: 'azure@furniture.com',
      phone: '9876543210',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
  });

  const customerNimesh = await prisma.contact.upsert({
    where: { email: 'nimesh@gmail.com' },
    update: {},
    create: {
      name: 'Nimesh Pathak',
      type: 'CUSTOMER',
      email: 'nimesh@gmail.com',
      phone: '9876501234',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
    },
  });

  // Seed portal login for customer Nimesh Pathak & vendor Azure Furniture
  const userPassword = await bcrypt.hash('Password@123', 10);
  await prisma.user.upsert({
    where: { loginId: 'nimeshp' },
    update: {
      contactId: customerNimesh.id,
    },
    create: {
      loginId: 'nimeshp',
      name: 'Nimesh Pathak',
      email: 'nimesh@gmail.com',
      password: userPassword,
      role: 'USER',
      contactId: customerNimesh.id,
    },
  });

  await prisma.user.upsert({
    where: { loginId: 'azure01' },
    update: {
      contactId: vendorAzure.id,
    },
    create: {
      loginId: 'azure01',
      name: 'Azure Furniture',
      email: 'azure@furniture.com',
      password: userPassword,
      role: 'USER',
      contactId: vendorAzure.id,
    },
  });

  // 5. Seed Products
  console.log('Seeding Master Products...');
  await prisma.product.createMany({
    data: [
      { name: 'Office Chair', type: 'GOODS', salesPrice: 4500, costPrice: 3000, category: 'Seating' },
      { name: 'Wooden Table', type: 'GOODS', salesPrice: 12000, costPrice: 8500, category: 'Tables' },
      { name: 'Sofa Set', type: 'GOODS', salesPrice: 28000, costPrice: 20000, category: 'Living Room' },
      { name: 'Dining Table', type: 'GOODS', salesPrice: 22000, costPrice: 15000, category: 'Dining' },
    ],
    skipDuplicates: true,
  });

  // 6. Seed Analytic Account & Budget
  console.log('Seeding Analytic Account & Budget...');
  const analytic = await prisma.analyticAccount.create({
    data: {
      name: 'Q3 Furniture Manufacturing',
      type: 'EXPENSE',
    },
  });

  await prisma.budget.create({
    data: {
      name: 'Q3 Production Budget',
      periodStart: new Date('2026-07-01'),
      periodEnd: new Date('2026-09-30'),
      responsiblePerson: 'Senior Accountant',
      analyticAccountId: analytic.id,
      plannedAmount: 100000,
      committedAmount: 0,
      status: 'CONFIRMED',
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
