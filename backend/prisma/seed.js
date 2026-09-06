const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Enterprise-Scale Database Seeding for Urban Furniture Accounting...');

  // ==========================================
  // 1. CLEAN EXISTING DATA (Reverse Cascade Order)
  // ==========================================
  console.log('Clearing existing records cleanly...');
  await prisma.journalItem.deleteMany({});
  await prisma.journalEntry.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.customerInvoiceLine.deleteMany({});
  await prisma.customerInvoice.deleteMany({});
  await prisma.salesOrderLine.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.vendorBillLine.deleteMany({});
  await prisma.vendorBill.deleteMany({});
  await prisma.purchaseOrderLine.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.analyticAccount.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.journal.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.contact.deleteMany({});

  // ==========================================
  // 2. CHART OF ACCOUNTS (35 Accounts)
  // ==========================================
  console.log('Seeding Standard Indian Chart of Accounts (35 Accounts)...');
  const accountsData = [
    // Assets (1000s)
    { code: '1001', name: 'Cash on Hand (Showroom Petty Cash)', type: 'ASSET' },
    { code: '1002', name: 'HDFC Bank Current A/c (Primary Operating)', type: 'ASSET' },
    { code: '1003', name: 'Debtors (Accounts Receivable)', type: 'ASSET' },
    { code: '1004', name: 'ICICI Bank Operations A/c', type: 'ASSET' },
    { code: '1005', name: 'SBI Corporate Current A/c', type: 'ASSET' },
    { code: '1006', name: 'GST Input Tax Credit - 5%', type: 'ASSET' },
    { code: '1007', name: 'GST Input Tax Credit - 12%', type: 'ASSET' },
    { code: '1008', name: 'GST Input Tax Credit - 18%', type: 'ASSET' },
    { code: '1009', name: 'Raw Materials Inventory', type: 'ASSET' },
    { code: '1010', name: 'Finished Goods Showroom Stock', type: 'ASSET' },

    // Liabilities (2000s)
    { code: '2001', name: 'Creditors (Accounts Payable)', type: 'LIABILITY' },
    { code: '2002', name: 'Tax Payable (GST 18% Output)', type: 'LIABILITY' },
    { code: '2003', name: 'Tax Payable (GST 12% Output)', type: 'LIABILITY' },
    { code: '2004', name: 'Tax Payable (GST 5% Output)', type: 'LIABILITY' },
    { code: '2005', name: 'TDS Payable (Contractor 194C)', type: 'LIABILITY' },
    { code: '2006', name: 'TDS Payable (Professional 194J)', type: 'LIABILITY' },
    { code: '2007', name: 'Accrued Staff Salaries & Bonus', type: 'LIABILITY' },
    { code: '2008', name: 'Outstanding Utilities & Power', type: 'LIABILITY' },
    { code: '2009', name: 'Customer Advance Deposits', type: 'LIABILITY' },

    // Capital & Equity (3000s)
    { code: '3001', name: 'Shareholder Capital (Equity)', type: 'CAPITAL' },
    { code: '3002', name: 'Retained Earnings', type: 'CAPITAL' },

    // Income (4000s)
    { code: '4001', name: 'Sales Income - Retail Showroom', type: 'INCOME' },
    { code: '4002', name: 'Sales Income - Corporate & Turnkey Projects', type: 'INCOME' },
    { code: '4003', name: 'Architectural Consultation & Design Fees', type: 'INCOME' },
    { code: '4004', name: 'Delivery, Shipping & Installation Charges', type: 'INCOME' },
    { code: '4005', name: 'Vendor Cash Discounts & Rebates Received', type: 'INCOME' },

    // Expenses (5000s)
    { code: '5001', name: 'Purchase Expense - Raw Materials & Goods', type: 'EXPENSE' },
    { code: '5002', name: 'Factory & Workshop Labour Wages', type: 'EXPENSE' },
    { code: '5003', name: 'Showroom Rent - MG Road Pune', type: 'EXPENSE' },
    { code: '5004', name: 'Warehouse Rent - Bhiwandi Logistics Depot', type: 'EXPENSE' },
    { code: '5005', name: 'Freight, Logistics & Courier Expense', type: 'EXPENSE' },
    { code: '5006', name: 'Electricity & Showroom Power Utility', type: 'EXPENSE' },
    { code: '5007', name: 'Digital Marketing, SEO & Social Ads', type: 'EXPENSE' },
    { code: '5008', name: 'Office Supplies & IT Software Subscriptions', type: 'EXPENSE' },
    { code: '5009', name: 'Bank Charges & Processing Fees', type: 'EXPENSE' },
  ];

  const accMap = {};
  for (const acc of accountsData) {
    const created = await prisma.account.create({ data: acc });
    accMap[acc.code] = created;
  }

  // ==========================================
  // 3. FINANCIAL JOURNALS (6 Journals)
  // ==========================================
  console.log('Seeding Financial Journals (6 Journals)...');
  const journalsData = [
    { name: 'Customer Sales Journal', code: 'SALES', type: 'SALES', defaultAccountId: accMap['1003'].id },
    { name: 'Vendor Purchase Journal', code: 'PURCH', type: 'PURCHASE', defaultAccountId: accMap['2001'].id },
    { name: 'HDFC Current Bank Journal', code: 'BANK', type: 'BANK', defaultAccountId: accMap['1002'].id },
    { name: 'ICICI Operations Bank Journal', code: 'ICICI', type: 'BANK', defaultAccountId: accMap['1004'].id },
    { name: 'SBI Corporate Bank Journal', code: 'SBI', type: 'BANK', defaultAccountId: accMap['1005'].id },
    { name: 'Showroom Cash Counter Journal', code: 'CASH', type: 'CASH', defaultAccountId: accMap['1001'].id },
  ];

  const jnlMap = {};
  for (const jnl of journalsData) {
    const created = await prisma.journal.create({ data: jnl });
    jnlMap[jnl.code] = created;
  }

  // ==========================================
  // 4. CONTACTS: 12 VENDORS + 25 CUSTOMERS = 37 CONTACTS
  // ==========================================
  console.log('Seeding Realistic Indian Contacts (12 Vendors + 25 Customers)...');
  const vendorsRaw = [
    { name: 'Azure Furniture Ltd', email: 'billing@azurefurniture.in', phone: '+91 22 2847 1100', city: 'Mumbai', state: 'Maharashtra', pincode: '400072' },
    { name: 'Urban Timber & Woods', email: 'accounts@urbantimber.co.in', phone: '+91 80 4122 8900', city: 'Bengaluru', state: 'Karnataka', pincode: '560043' },
    { name: 'DecoWood Laminates Ltd', email: 'sales@decowood.in', phone: '+91 79 2658 4410', city: 'Ahmedabad', state: 'Gujarat', pincode: '380009' },
    { name: 'Kurlon Foam & Fabrics', email: 'institutional@kurlon.com', phone: '+91 80 2226 7711', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    { name: 'Godrej Precision Hardware', email: 'hardware@godrej.com', phone: '+91 20 6601 3320', city: 'Pune', state: 'Maharashtra', pincode: '411014' },
    { name: 'Greenply Architectural Panels', email: 'commercial@greenply.in', phone: '+91 33 2289 5500', city: 'Kolkata', state: 'West Bengal', pincode: '700071' },
    { name: 'Nilkamal Molded Components', email: 'orders@nilkamal.com', phone: '+91 253 238 9011', city: 'Nashik', state: 'Maharashtra', pincode: '422007' },
    { name: 'Century Plyboards India', email: 'corporate@centuryply.com', phone: '+91 44 2827 6650', city: 'Chennai', state: 'Tamil Nadu', pincode: '600006' },
    { name: 'Featherlite Steel Frames', email: 'components@featherlite.in', phone: '+91 80 4344 5500', city: 'Bengaluru', state: 'Karnataka', pincode: '560027' },
    { name: 'Duroflex Comfort Systems', email: 'supplies@duroflexworld.com', phone: '+91 40 2335 8890', city: 'Hyderabad', state: 'Telangana', pincode: '500034' },
    { name: 'Pidilite Industrial Adhesives', email: 'b2b@pidilite.com', phone: '+91 22 2835 7000', city: 'Mumbai', state: 'Maharashtra', pincode: '400059' },
    { name: 'Saint-Gobain Architectural Glass', email: 'glass.india@saint-gobain.com', phone: '+91 44 4567 8900', city: 'Chennai', state: 'Tamil Nadu', pincode: '600089' },
  ];

  const customersRaw = [
    { name: 'Nimesh Pathak', email: 'nimesh@gmail.com', phone: '+91 98765 43210', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015' },
    { name: 'Priya Sharma Interiors', email: 'priya.sharma@designstudio.in', phone: '+91 98201 44521', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
    { name: 'Karan Patel Tech Ventures', email: 'karan.patel@pateltech.com', phone: '+91 99099 88123', city: 'Ahmedabad', state: 'Gujarat', pincode: '380054' },
    { name: 'Radhika Merchant Living', email: 'radhika@merchantdesigns.com', phone: '+91 98210 55432', city: 'Mumbai', state: 'Maharashtra', pincode: '400026' },
    { name: 'Apex Workspace Solutions', email: 'procurement@apexspaces.in', phone: '+91 80 4099 2200', city: 'Bengaluru', state: 'Karnataka', pincode: '560100' },
    { name: 'Zeta Tech Labs Pvt Ltd', email: 'admin@zetalabs.io', phone: '+91 40 6711 9900', city: 'Hyderabad', state: 'Telangana', pincode: '500081' },
    { name: 'Oberoi Luxury Living Suites', email: 'projects@oberoigroup.com', phone: '+91 11 2389 0505', city: 'New Delhi', state: 'Delhi', pincode: '110054' },
    { name: 'Mahindra Heights Residency', email: 'facilities@mahindraheights.org', phone: '+91 20 2567 1122', city: 'Pune', state: 'Maharashtra', pincode: '411005' },
    { name: 'Godrej Green Spaces Ltd', email: 'interiors@godrejgreens.com', phone: '+91 22 6796 5000', city: 'Mumbai', state: 'Maharashtra', pincode: '400079' },
    { name: 'Infosys Campus Facilities', email: 'facilities.blr@infosys.com', phone: '+91 80 2852 0261', city: 'Bengaluru', state: 'Karnataka', pincode: '560100' },
    { name: 'Tata Consultancy Workspace', email: 'admin.infopark@tcs.com', phone: '+91 33 6636 4000', city: 'Kolkata', state: 'West Bengal', pincode: '700156' },
    { name: 'Reliance Digital Workspace', email: 'workplace@ril.com', phone: '+91 22 7967 0000', city: 'Navi Mumbai', state: 'Maharashtra', pincode: '400701' },
    { name: 'DLF CyberCity Executive Offices', email: 'leasing@dlf.in', phone: '+91 124 456 8900', city: 'Gurugram', state: 'Haryana', pincode: '122002' },
    { name: 'HDFC Bank Regional Branch', email: 'premises.south@hdfcbank.com', phone: '+91 44 2855 1020', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002' },
    { name: 'Aditya Birla Fashion Studios', email: 'projects@abfrl.com', phone: '+91 22 6225 9000', city: 'Mumbai', state: 'Maharashtra', pincode: '400063' },
    { name: 'Wipro Infrastructure Wing', email: 'workspaces@wipro.com', phone: '+91 80 2844 0011', city: 'Bengaluru', state: 'Karnataka', pincode: '560035' },
    { name: 'L&T Construction HQ', email: 'corporate.offices@larsentoubro.com', phone: '+91 22 6752 5656', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    { name: 'Brigade Gateway Residences', email: 'management@brigadegateway.com', phone: '+91 80 4043 8000', city: 'Bengaluru', state: 'Karnataka', pincode: '560055' },
    { name: 'Sun Pharma Corporate HQ', email: 'admin.vadodara@sunpharma.com', phone: '+91 265 233 0887', city: 'Vadodara', state: 'Gujarat', pincode: '390020' },
    { name: 'Zomato HQ Facilities', email: 'workplace@zomato.com', phone: '+91 124 415 6700', city: 'Gurugram', state: 'Haryana', pincode: '122001' },
    { name: 'Swiggy Regional Hub', email: 'spaces@swiggy.in', phone: '+91 80 6745 2000', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' },
    { name: 'PayTM One97 Tower', email: 'premises@paytm.com', phone: '+91 120 477 0770', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
    { name: 'Flipkart Internet Pvt Ltd', email: 'procure@flipkart.com', phone: '+91 80 4908 0000', city: 'Bengaluru', state: 'Karnataka', pincode: '560103' },
    { name: 'Raymond Lifestyle Stores', email: 'retail.expansion@raymond.in', phone: '+91 22 6152 7000', city: 'Thane', state: 'Maharashtra', pincode: '4000606' },
    { name: 'Titan Watch Showroom Network', email: 'retailprojects@titan.co.in', phone: '+91 4344 660 000', city: 'Hosur', state: 'Tamil Nadu', pincode: '635126' },
  ];

  const vendorContacts = [];
  for (const v of vendorsRaw) {
    const c = await prisma.contact.create({ data: { ...v, type: 'VENDOR' } });
    vendorContacts.push(c);
  }

  const customerContacts = [];
  for (const c of customersRaw) {
    const created = await prisma.contact.create({ data: { ...c, type: 'CUSTOMER' } });
    customerContacts.push(created);
  }

  // ==========================================
  // 5. USERS & ROLES (10 Users)
  // ==========================================
  console.log('Seeding User Logins (10 Users)...');
  const hashedAdmin = await bcrypt.hash('Admin@123', 10);
  const hashedUser = await bcrypt.hash('Password@123', 10);

  const usersData = [
    { loginId: 'admin', name: 'Master Administrator', email: 'admin@urbanfurniture.in', password: hashedAdmin, role: 'ADMIN' },
    { loginId: 'system_admin', name: 'DevOps System Admin', email: 'sysadmin@urbanfurniture.in', password: hashedAdmin, role: 'ADMIN' },
    { loginId: 'accountant01', name: 'Alex Accountant', email: 'alex@urbanfurniture.in', password: hashedUser, role: 'ACCOUNTANT' },
    { loginId: 'finance_lead', name: 'Vikram Sethi (CFO)', email: 'vikram.sethi@urbanfurniture.in', password: hashedUser, role: 'ACCOUNTANT' },
    { loginId: 'sales01', name: 'Kavita Iyer (Showroom Manager)', email: 'kavita@urbanfurniture.in', password: hashedUser, role: 'USER' },
    { loginId: 'nimeshp', name: 'Nimesh Pathak', email: 'nimesh@gmail.com', password: hashedUser, role: 'USER', contactId: customerContacts[0].id },
    { loginId: 'priyas', name: 'Priya Sharma', email: 'priya.sharma@designstudio.in', password: hashedUser, role: 'USER', contactId: customerContacts[1].id },
    { loginId: 'karanp', name: 'Karan Patel', email: 'karan.patel@pateltech.com', password: hashedUser, role: 'USER', contactId: customerContacts[2].id },
    { loginId: 'azure01', name: 'Azure Furniture Rep', email: 'azure.rep@azurefurniture.in', password: hashedUser, role: 'USER', contactId: vendorContacts[0].id },
    { loginId: 'urbantimber01', name: 'Urban Timber Rep', email: 'timber.rep@urbantimber.co.in', password: hashedUser, role: 'USER', contactId: vendorContacts[1].id },
  ];

  for (const u of usersData) {
    await prisma.user.create({ data: u });
  }

  // ==========================================
  // 6. PRODUCT CATALOG (48 Products across 9 Categories)
  // ==========================================
  console.log('Seeding Product Catalog (48 Products in 9 Categories)...');
  const productsRaw = [
    // 1. Executive Chairs
    { name: 'Ergonomic Executive High-Back Mesh Chair', category: 'Executive Chairs', costPrice: 11200, salesPrice: 16500, type: 'GOODS', stock: 35 },
    { name: 'Aero Ergonomic Lumbar Task Chair', category: 'Executive Chairs', costPrice: 7500, salesPrice: 11900, type: 'GOODS', stock: 48 },
    { name: 'Presidential Genuine Leather Swivel Chair', category: 'Executive Chairs', costPrice: 24000, salesPrice: 38500, type: 'GOODS', stock: 12 },
    { name: 'Mid-Back Ribbed Leatherette Studio Chair', category: 'Executive Chairs', costPrice: 5800, salesPrice: 8990, type: 'GOODS', stock: 60 },
    { name: 'Breathable Syncro-Tilt Drafting Stool', category: 'Executive Chairs', costPrice: 6200, salesPrice: 9500, type: 'GOODS', stock: 25 },

    // 2. Ergonomic Desks
    { name: 'Dual-Motor Electric Height-Adjustable Standing Desk (150x75cm)', category: 'Ergonomic Desks', costPrice: 19500, salesPrice: 29999, type: 'GOODS', stock: 18 },
    { name: 'Single-Motor Compact Stand Desk (120x60cm)', category: 'Ergonomic Desks', costPrice: 13500, salesPrice: 21500, type: 'GOODS', stock: 22 },
    { name: 'Solid Teak Wood Executive Study Desk with Cable Tray', category: 'Ergonomic Desks', costPrice: 22000, salesPrice: 34500, type: 'GOODS', stock: 10 },
    { name: 'Minimalist Industrial Steel Frame Desk', category: 'Ergonomic Desks', costPrice: 6800, salesPrice: 10900, type: 'GOODS', stock: 30 },
    { name: 'L-Shaped Corner Executive Workstation with Modesty Panel', category: 'Ergonomic Desks', costPrice: 26000, salesPrice: 42000, type: 'GOODS', stock: 8 },

    // 3. Living Room Sofas
    { name: 'Scandinavian 3-Seater Fabric Sofa (Slate Grey)', category: 'Living Room Sofas', costPrice: 24500, salesPrice: 38500, type: 'GOODS', stock: 15 },
    { name: 'Chesterfield 3-Seater Tufted Leather Sofa', category: 'Living Room Sofas', costPrice: 48000, salesPrice: 75000, type: 'GOODS', stock: 6 },
    { name: 'Modular L-Sectional Fabric Sofa with Ottoman', category: 'Living Room Sofas', costPrice: 39000, salesPrice: 62000, type: 'GOODS', stock: 9 },
    { name: 'Velvet Accent Armchair with Brass Legs', category: 'Living Room Sofas', costPrice: 9200, salesPrice: 14200, type: 'GOODS', stock: 20 },
    { name: 'Reclining Cinema Single-Seater Lounger', category: 'Living Room Sofas', costPrice: 16500, salesPrice: 26000, type: 'GOODS', stock: 14 },
    { name: 'Contemporary Loveseat 2-Seater Velvet Couch', category: 'Living Room Sofas', costPrice: 17500, salesPrice: 27900, type: 'GOODS', stock: 11 },

    // 4. Dining & Hospitality
    { name: 'Solid Sheesham Wood 6-Seater Dining Table', category: 'Dining & Hospitality', costPrice: 26000, salesPrice: 42000, type: 'GOODS', stock: 12 },
    { name: 'Set of 4 Upholstered Dining Chairs (Teak Finish)', category: 'Dining & Hospitality', costPrice: 12000, salesPrice: 19800, type: 'GOODS', stock: 28 },
    { name: 'Italian White Marble Top 8-Seater Luxury Dining Table', category: 'Dining & Hospitality', costPrice: 55000, salesPrice: 89000, type: 'GOODS', stock: 4 },
    { name: 'Solid Oak Bar Stool with Swivel Cushion (Set of 2)', category: 'Dining & Hospitality', costPrice: 5800, salesPrice: 9400, type: 'GOODS', stock: 32 },
    { name: 'Compact 4-Seater Folding Breakfast Dining Set', category: 'Dining & Hospitality', costPrice: 10500, salesPrice: 16900, type: 'GOODS', stock: 18 },

    // 5. Bedroom & Wardrobes
    { name: 'King Size Engineered Wood Hydraulic Storage Bed', category: 'Bedroom & Wardrobes', costPrice: 31000, salesPrice: 48000, type: 'GOODS', stock: 10 },
    { name: 'Queen Size Solid Sheesham Platform Bed', category: 'Bedroom & Wardrobes', costPrice: 24000, salesPrice: 37500, type: 'GOODS', stock: 13 },
    { name: '3-Door Mirrored Wardrobe with Soft-Close Hinges', category: 'Bedroom & Wardrobes', costPrice: 28000, salesPrice: 44000, type: 'GOODS', stock: 9 },
    { name: 'Engineered Wood 2-Drawer Bedside Table (Pair)', category: 'Bedroom & Wardrobes', costPrice: 4200, salesPrice: 6990, type: 'GOODS', stock: 40 },
    { name: 'Orthopedic Multi-Layer Memory Foam Mattress (King)', category: 'Bedroom & Wardrobes', costPrice: 18000, salesPrice: 28500, type: 'GOODS', stock: 20 },

    // 6. Conference & Meeting
    { name: '10-Seater Oval Executive Conference Table (320x120cm)', category: 'Conference & Meeting', costPrice: 42000, salesPrice: 68000, type: 'GOODS', stock: 7 },
    { name: 'Leatherette Conference Room Mid-Back Chair', category: 'Conference & Meeting', costPrice: 7400, salesPrice: 11900, type: 'GOODS', stock: 55 },
    { name: 'Modular Flip-Top Training Table with Wheels (140x60cm)', category: 'Conference & Meeting', costPrice: 8200, salesPrice: 13500, type: 'GOODS', stock: 24 },
    { name: 'Acoustic Mobile Meeting Whiteboard Screen', category: 'Conference & Meeting', costPrice: 9500, salesPrice: 15400, type: 'GOODS', stock: 16 },
    { name: 'Presentation Lectern Podium with Audio Mount', category: 'Conference & Meeting', costPrice: 11000, salesPrice: 18000, type: 'GOODS', stock: 8 },

    // 7. Storage & Modular
    { name: '4-Tier Industrial Steel & Oak Wood Bookshelf', category: 'Storage & Modular', costPrice: 7800, salesPrice: 12400, type: 'GOODS', stock: 30 },
    { name: 'Modular 3-Drawer Under-Desk Mobile Pedestal', category: 'Storage & Modular', costPrice: 4600, salesPrice: 7500, type: 'GOODS', stock: 45 },
    { name: 'Tambour Door Steel Office Credenza Cabinet', category: 'Storage & Modular', costPrice: 13500, salesPrice: 21900, type: 'GOODS', stock: 15 },
    { name: 'Heavy-Duty 5-Shelf Warehouse Slotted Angle Rack', category: 'Storage & Modular', costPrice: 5200, salesPrice: 8400, type: 'GOODS', stock: 38 },
    { name: 'Low-Height Filing Storage Credenza (180cm)', category: 'Storage & Modular', costPrice: 15000, salesPrice: 24500, type: 'GOODS', stock: 12 },

    // 8. Lounge & Reception
    { name: 'Modern Geometric Glass & Teak Coffee Table', category: 'Lounge & Reception', costPrice: 6100, salesPrice: 9800, type: 'GOODS', stock: 22 },
    { name: 'Curved Reception Front Desk with LED Illumination (240cm)', category: 'Lounge & Reception', costPrice: 38000, salesPrice: 62000, type: 'GOODS', stock: 5 },
    { name: '2-Seater Waiting Lounge Bench with Vegan Leather Cushion', category: 'Lounge & Reception', costPrice: 8900, salesPrice: 14500, type: 'GOODS', stock: 28 },
    { name: 'Round Fluted Wood Accent Side Table', category: 'Lounge & Reception', costPrice: 3400, salesPrice: 5600, type: 'GOODS', stock: 35 },
    { name: 'Acoustic High-Back Privacy Pod Single Sofa', category: 'Lounge & Reception', costPrice: 22000, salesPrice: 35000, type: 'GOODS', stock: 8 },

    // 9. Architectural Fixtures & Services
    { name: 'Acoustic Fabric Wall Panel (Set of 6 Tiles)', category: 'Architectural Fixtures', costPrice: 4800, salesPrice: 7900, type: 'GOODS', stock: 50 },
    { name: 'Frosted Glass Aluminium Office Partition (Per Panel)', category: 'Architectural Fixtures', costPrice: 12500, salesPrice: 19800, type: 'GOODS', stock: 40 },
    { name: 'Industrial Pendant Hanging Chandelier Light (Warm LED)', category: 'Architectural Fixtures', costPrice: 3900, salesPrice: 6500, type: 'GOODS', stock: 60 },
    { name: 'Architectural Turnkey Layout & 3D Ergonomic Consultation', category: 'Architectural Fixtures', costPrice: 5000, salesPrice: 15000, type: 'SERVICE', stock: 0 },
    { name: 'On-Site White-Glove Furniture Assembly & Rigging Service', category: 'Architectural Fixtures', costPrice: 2000, salesPrice: 4500, type: 'SERVICE', stock: 0 },
    { name: 'Custom Corporate Logo Laser Wood Engraving Service', category: 'Architectural Fixtures', costPrice: 1500, salesPrice: 3500, type: 'SERVICE', stock: 0 },
    { name: 'Annual Ergonomic Seating Preventive Maintenance Package', category: 'Architectural Fixtures', costPrice: 4000, salesPrice: 8500, type: 'SERVICE', stock: 0 },
  ];

  const products = [];
  for (const p of productsRaw) {
    const created = await prisma.product.create({ data: { ...p, status: 'ACTIVE' } });
    products.push(created);
  }


  // ==========================================
  // 7. WAREHOUSES & ANALYTIC COST CENTERS (3 Warehouses, 4 Budgets)
  // ==========================================
  console.log('Seeding Warehouses as Analytic Cost Centers & Budgets...');
  const analyticPune = await prisma.analyticAccount.create({
    data: { name: 'Pune Central Showroom & Assembly Facility', type: 'EXPENSE' },
  });
  const analyticBhiwandi = await prisma.analyticAccount.create({
    data: { name: 'Bhiwandi Central Logistics Hub (Mumbai)', type: 'EXPENSE' },
  });
  const analyticGurugram = await prisma.analyticAccount.create({
    data: { name: 'Gurugram Northern Regional Depot', type: 'EXPENSE' },
  });

  const budgetsData = [
    {
      name: 'Showroom Operational Budget FY26',
      periodStart: new Date('2026-04-01'),
      periodEnd: new Date('2027-03-31'),
      responsiblePerson: 'Kavita Iyer (Showroom Lead)',
      analyticAccountId: analyticPune.id,
      plannedAmount: 350000,
      committedAmount: 240000,
      status: 'CONFIRMED',
    },
    {
      name: 'Bhiwandi Logistics Depot Budget FY26',
      periodStart: new Date('2026-04-01'),
      periodEnd: new Date('2027-03-31'),
      responsiblePerson: 'Rajesh Nair (Logistics Head)',
      analyticAccountId: analyticBhiwandi.id,
      plannedAmount: 480000,
      committedAmount: 390000,
      status: 'CONFIRMED',
    },
    {
      name: 'Raw Timber & Material Procurement FY26',
      periodStart: new Date('2026-04-01'),
      periodEnd: new Date('2027-03-31'),
      responsiblePerson: 'Alex Accountant',
      analyticAccountId: analyticPune.id,
      plannedAmount: 800000,
      committedAmount: 650000,
      status: 'CONFIRMED',
    },
    {
      name: 'Gurugram Regional Expansion FY26',
      periodStart: new Date('2026-04-01'),
      periodEnd: new Date('2027-03-31'),
      responsiblePerson: 'Vikram Sethi (CFO)',
      analyticAccountId: analyticGurugram.id,
      plannedAmount: 250000,
      committedAmount: 180000,
      status: 'CONFIRMED',
    },
  ];

  for (const b of budgetsData) {
    await prisma.budget.create({ data: b });
  }

  // ==========================================
  // 8. OPENING CAPITAL BALANCE JOURNAL ENTRY
  // ==========================================
  console.log('Posting Opening Capital Journal Entry (Double-Entry Balanced)...');
  await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE0000',
      date: new Date('2026-04-01T00:00:00.000Z'),
      reference: 'Opening Capital Infusion FY26',
      journalId: jnlMap['BANK'].id,
      status: 'POSTED',
      items: {
        create: [
          { accountId: accMap['1001'].id, debit: 100000, credit: 0, label: 'Opening Cash on Hand' },
          { accountId: accMap['1002'].id, debit: 1500000, credit: 0, label: 'Opening HDFC Current Balance' },
          { accountId: accMap['1004'].id, debit: 800000, credit: 0, label: 'Opening ICICI Operations Balance' },
          { accountId: accMap['1005'].id, debit: 600000, credit: 0, label: 'Opening SBI Corporate Balance' },
          { accountId: accMap['3001'].id, debit: 0, credit: 3000000, label: 'Promoter Shareholder Capital' },
        ],
      },
    },
  });

  function makeDate(daysAgo) {
    const d = new Date('2026-09-05T00:00:00.000Z');
    d.setDate(d.getDate() - daysAgo);
    return d;
  }

  let jeSeq = 1;
  function nextJE() {
    return 'JE' + String(jeSeq++).padStart(4, '0');
  }

  let payInSeq = 1;
  function nextPayIn() {
    return 'PAY-IN-' + String(payInSeq++).padStart(4, '0');
  }

  let payOutSeq = 1;
  function nextPayOut() {
    return 'PAY-OUT-' + String(payOutSeq++).padStart(4, '0');
  }

  // ==========================================
  // 9. PURCHASE ORDERS (36 POs) & VENDOR BILLS (32 Bills)
  // ==========================================
  console.log('Seeding 36 Purchase Orders & 32 Vendor Bills with Double-Entry Journals...');
  const poStatuses = [
    ...Array(20).fill('BILLED'),
    ...Array(10).fill('CONFIRMED'),
    ...Array(6).fill('DRAFT'),
  ];

  const billStatuses = [
    ...Array(16).fill('PAID'),
    ...Array(12).fill('CONFIRMED'),
    ...Array(4).fill('DRAFT'),
  ];

  for (let i = 0; i < 36; i++) {
    const poNum = 'PO' + String(i + 1).padStart(4, '0');
    const vendor = vendorContacts[i % vendorContacts.length];
    const status = poStatuses[i];
    const poDate = makeDate(50 - i);

    const hasThree = (i % 2 === 0);
    const p1 = products[(i * 3) % products.length];
    const p2 = products[(i * 3 + 1) % products.length];
    const p3 = products[(i * 3 + 2) % products.length];
    const qty1 = (i % 4) + 2;
    const qty2 = (i % 3) + 1;
    const qty3 = (i % 2) + 1;
    const sub1 = Number(p1.costPrice) * qty1;
    const sub2 = Number(p2.costPrice) * qty2;
    const sub3 = hasThree ? Number(p3.costPrice) * qty3 : 0;
    const total = sub1 + sub2 + sub3;

    const poLinesData = [
      { productId: p1.id, quantity: qty1, unitPrice: p1.costPrice, subtotal: sub1 },
      { productId: p2.id, quantity: qty2, unitPrice: p2.costPrice, subtotal: sub2 },
    ];
    if (hasThree) {
      poLinesData.push({ productId: p3.id, quantity: qty3, unitPrice: p3.costPrice, subtotal: sub3 });
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: poNum,
        vendorId: vendor.id,
        date: poDate,
        status: status,
        totalAmount: total,
        lines: { create: poLinesData },
      },
    });

    if (i < 32) {
      const billNum = 'BILL' + String(i + 1).padStart(4, '0');
      const bStatus = billStatuses[i];
      const dueDate = new Date(poDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const isPaid = bStatus === 'PAID';
      const paidAmt = isPaid ? total : (bStatus === 'CONFIRMED' && i % 3 === 0 ? Math.round(total * 0.4) : 0);

      let jeId = null;
      if (bStatus !== 'DRAFT') {
        const je = await prisma.journalEntry.create({
          data: {
            entryNumber: nextJE(),
            date: poDate,
            reference: 'Vendor Bill ' + billNum + ' - ' + vendor.name,
            journalId: jnlMap['PURCH'].id,
            status: 'POSTED',
            items: {
              create: [
                {
                  accountId: accMap['5001'].id,
                  partnerId: vendor.id,
                  analyticAccountId: analyticPune.id,
                  debit: total,
                  credit: 0,
                  label: 'Procurement: ' + p1.name + (hasThree ? ', ' + p2.name + ', ' + p3.name : ' & ' + p2.name),
                },
                {
                  accountId: accMap['2001'].id,
                  partnerId: vendor.id,
                  debit: 0,
                  credit: total,
                  label: 'AP Liability: ' + vendor.name,
                },
              ],
            },
          },
        });
        jeId = je.id;
      }

      const billLinesData = [
        { productId: p1.id, quantity: qty1, unitPrice: p1.costPrice, subtotal: sub1 },
        { productId: p2.id, quantity: qty2, unitPrice: p2.costPrice, subtotal: sub2 },
      ];
      if (hasThree) {
        billLinesData.push({ productId: p3.id, quantity: qty3, unitPrice: p3.costPrice, subtotal: sub3 });
      }

      const bill = await prisma.vendorBill.create({
        data: {
          billNumber: billNum,
          reference: 'SUPP-REF-' + (1000 + i),
          purchaseOrderId: po.id,
          vendorId: vendor.id,
          billDate: poDate,
          dueDate: dueDate,
          status: bStatus,
          totalAmount: total,
          paidAmount: paidAmt,
          journalEntryId: jeId,
          lines: { create: billLinesData },
        },
      });

      if ((paidAmt > 0 || (i < 24 && bStatus !== 'DRAFT')) && payOutSeq <= 24) {
        const actualPay = paidAmt > 0 ? paidAmt : Math.round(total * 0.5);
        const payDate = new Date(poDate);
        payDate.setDate(payDate.getDate() + 10);
        const bankKey = (i % 3 === 0) ? 'BANK' : (i % 3 === 1 ? 'ICICI' : 'SBI');
        const bankAccount = (i % 3 === 0) ? accMap['1002'] : (i % 3 === 1 ? accMap['1004'] : accMap['1005']);

        await prisma.payment.create({
          data: {
            paymentNumber: nextPayOut(),
            paymentType: 'OUTBOUND',
            partnerId: vendor.id,
            billId: bill.id,
            amount: actualPay,
            paymentMethod: 'BANK',
            journalId: jnlMap[bankKey].id,
            date: payDate,
            status: 'POSTED',
          },
        });

        await prisma.journalEntry.create({
          data: {
            entryNumber: nextJE(),
            date: payDate,
            reference: 'Vendor Payment for ' + billNum + ' to ' + vendor.name,
            journalId: jnlMap[bankKey].id,
            status: 'POSTED',
            items: {
              create: [
                {
                  accountId: accMap['2001'].id,
                  partnerId: vendor.id,
                  debit: actualPay,
                  credit: 0,
                  label: 'Clear AP: ' + vendor.name,
                },
                {
                  accountId: bankAccount.id,
                  partnerId: vendor.id,
                  debit: 0,
                  credit: actualPay,
                  label: 'Disbursement via ' + bankKey,
                },
              ],
            },
          },
        });
      }
    }
  }

  // ==========================================
  // 10. SALES ORDERS (48 SOs) & CUSTOMER INVOICES (42 Invoices)
  // ==========================================
  console.log('Seeding 48 Sales Orders & 42 Customer Invoices with Double-Entry Journals...');
  const soStatuses = [
    ...Array(28).fill('INVOICED'),
    ...Array(12).fill('CONFIRMED'),
    ...Array(8).fill('DRAFT'),
  ];

  const invStatuses = [
    ...Array(22).fill('PAID'),
    ...Array(15).fill('CONFIRMED'),
    ...Array(5).fill('DRAFT'),
  ];

  for (let i = 0; i < 48; i++) {
    const soNum = 'SO' + String(i + 1).padStart(4, '0');
    const customer = customerContacts[i % customerContacts.length];
    const status = soStatuses[i];
    const soDate = makeDate(48 - i);

    const hasThree = (i % 2 === 0);
    const p1 = products[(i * 2 + 5) % products.length];
    const p2 = products[(i * 2 + 6) % products.length];
    const p3 = products[(i * 2 + 7) % products.length];
    const qty1 = (i % 4) + 1;
    const qty2 = (i % 3) + 1;
    const qty3 = (i % 2) + 1;
    const sub1 = Number(p1.salesPrice) * qty1;
    const sub2 = Number(p2.salesPrice) * qty2;
    const sub3 = hasThree ? Number(p3.salesPrice) * qty3 : 0;
    const subtotal = sub1 + sub2 + sub3;
    const taxRate = 18;
    const taxAmount = Math.round((subtotal * 18) / 100);
    const totalAmount = subtotal + taxAmount;

    const soLinesData = [
      { productId: p1.id, quantity: qty1, unitPrice: p1.salesPrice, subtotal: sub1 },
      { productId: p2.id, quantity: qty2, unitPrice: p2.salesPrice, subtotal: sub2 },
    ];
    if (hasThree) {
      soLinesData.push({ productId: p3.id, quantity: qty3, unitPrice: p3.salesPrice, subtotal: sub3 });
    }

    const so = await prisma.salesOrder.create({
      data: {
        soNumber: soNum,
        customerId: customer.id,
        date: soDate,
        status: status,
        taxRate: taxRate,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        lines: { create: soLinesData },
      },
    });

    if (i < 42) {
      const invNum = 'INV' + String(i + 1).padStart(4, '0');
      const invStatus = invStatuses[i];
      const dueDate = new Date(soDate);
      dueDate.setDate(dueDate.getDate() + 15);
      const isPaid = invStatus === 'PAID';
      const paidAmt = isPaid ? totalAmount : (invStatus === 'CONFIRMED' && i % 3 === 0 ? Math.round(totalAmount * 0.5) : 0);

      let jeId = null;
      if (invStatus !== 'DRAFT') {
        const incomeAcc = (i % 2 === 0) ? accMap['4001'] : accMap['4002'];
        const je = await prisma.journalEntry.create({
          data: {
            entryNumber: nextJE(),
            date: soDate,
            reference: 'Customer Invoice ' + invNum + ' - ' + customer.name,
            journalId: jnlMap['SALES'].id,
            status: 'POSTED',
            items: {
              create: [
                {
                  accountId: accMap['1003'].id,
                  partnerId: customer.id,
                  debit: totalAmount,
                  credit: 0,
                  label: 'AR Receivable: ' + customer.name,
                },
                {
                  accountId: incomeAcc.id,
                  partnerId: customer.id,
                  debit: 0,
                  credit: subtotal,
                  label: 'Sales Revenue: ' + p1.name + (hasThree ? ', ' + p2.name + ', ' + p3.name : ' & ' + p2.name),
                },
                {
                  accountId: accMap['2002'].id,
                  partnerId: customer.id,
                  debit: 0,
                  credit: taxAmount,
                  label: 'GST Output 18% on ' + invNum,
                },
              ],
            },
          },
        });
        jeId = je.id;
      }

      const invLinesData = [
        { productId: p1.id, quantity: qty1, unitPrice: p1.salesPrice, subtotal: sub1 },
        { productId: p2.id, quantity: qty2, unitPrice: p2.salesPrice, subtotal: sub2 },
      ];
      if (hasThree) {
        invLinesData.push({ productId: p3.id, quantity: qty3, unitPrice: p3.salesPrice, subtotal: sub3 });
      }

      const inv = await prisma.customerInvoice.create({
        data: {
          invNumber: invNum,
          salesOrderId: so.id,
          customerId: customer.id,
          invoiceDate: soDate,
          dueDate: dueDate,
          taxRate: taxRate,
          taxAmount: taxAmount,
          totalAmount: totalAmount,
          paidAmount: paidAmt,
          journalEntryId: jeId,
          status: invStatus,
          lines: { create: invLinesData },
        },
      });

      if ((paidAmt > 0 || (i < 36 && invStatus !== 'DRAFT')) && payInSeq <= 36) {
        const actualReceipt = paidAmt > 0 ? paidAmt : Math.round(totalAmount * 0.6);
        const payDate = new Date(soDate);
        payDate.setDate(payDate.getDate() + 5);
        const isCash = (i % 7 === 0);
        const bankKey = isCash ? 'CASH' : ((i % 2 === 0) ? 'BANK' : 'ICICI');
        const bankAccount = isCash ? accMap['1001'] : ((i % 2 === 0) ? accMap['1002'] : accMap['1004']);

        await prisma.payment.create({
          data: {
            paymentNumber: nextPayIn(),
            paymentType: 'INBOUND',
            partnerId: customer.id,
            invoiceId: inv.id,
            amount: actualReceipt,
            paymentMethod: isCash ? 'CASH' : 'BANK',
            journalId: jnlMap[bankKey].id,
            date: payDate,
            status: 'POSTED',
          },
        });

        await prisma.journalEntry.create({
          data: {
            entryNumber: nextJE(),
            date: payDate,
            reference: 'Customer Receipt for ' + invNum + ' from ' + customer.name,
            journalId: jnlMap[bankKey].id,
            status: 'POSTED',
            items: {
              create: [
                {
                  accountId: bankAccount.id,
                  partnerId: customer.id,
                  debit: actualReceipt,
                  credit: 0,
                  label: 'Receipt into ' + bankKey,
                },
                {
                  accountId: accMap['1003'].id,
                  partnerId: customer.id,
                  debit: 0,
                  credit: actualReceipt,
                  label: 'Clear AR: ' + customer.name,
                },
              ],
            },
          },
        });
      }
    }
  }

  // ==========================================
  // 11. OPERATIONAL EXPENSES (24 Journal Entries)
  // ==========================================
  console.log('Seeding 24 Operational Expenses Journal Entries (Rent, Logistics, Utilities)...');
  const expenseDefs = [
    { acc: accMap['5003'], name: 'Showroom Rent MG Road Pune (Month 1)', amt: 85000, analytic: analyticPune, bank: 'BANK', accBank: accMap['1002'] },
    { acc: accMap['5003'], name: 'Showroom Rent MG Road Pune (Month 2)', amt: 85000, analytic: analyticPune, bank: 'BANK', accBank: accMap['1002'] },
    { acc: accMap['5004'], name: 'Bhiwandi Logistics Hub Rent (Month 1)', amt: 120000, analytic: analyticBhiwandi, bank: 'BANK', accBank: accMap['1002'] },
    { acc: accMap['5004'], name: 'Bhiwandi Logistics Hub Rent (Month 2)', amt: 120000, analytic: analyticBhiwandi, bank: 'BANK', accBank: accMap['1002'] },
    { acc: accMap['5005'], name: 'Gati-KWE Regional Freight Charges (Shipment A)', amt: 32400, analytic: analyticBhiwandi, bank: 'ICICI', accBank: accMap['1004'] },
    { acc: accMap['5005'], name: 'BlueDart Air Express Logistics (High-Priority)', amt: 18500, analytic: analyticBhiwandi, bank: 'ICICI', accBank: accMap['1004'] },
    { acc: accMap['5005'], name: 'Delhivery Surface Logistics (Batch B)', amt: 27900, analytic: analyticBhiwandi, bank: 'ICICI', accBank: accMap['1004'] },
    { acc: accMap['5005'], name: 'SafeExpress Interstate Trucking (Batch C)', amt: 41200, analytic: analyticBhiwandi, bank: 'SBI', accBank: accMap['1005'] },
    { acc: accMap['5006'], name: 'MSEDCL Commercial Power Utility Bill (Showroom)', amt: 19800, analytic: analyticPune, bank: 'BANK', accBank: accMap['1002'] },
    { acc: accMap['5006'], name: 'MSEDCL Industrial Electricity Bill (Bhiwandi)', amt: 34500, analytic: analyticBhiwandi, bank: 'ICICI', accBank: accMap['1004'] },
    { acc: accMap['5007'], name: 'Google Ads & Meta Campaign for Festive Sale', amt: 45000, analytic: analyticPune, bank: 'ICICI', accBank: accMap['1004'] },
    { acc: accMap['5007'], name: 'Architectural Digest Print Feature & PR', amt: 35000, analytic: analyticPune, bank: 'SBI', accBank: accMap['1005'] },
    { acc: accMap['5002'], name: 'Contract Workshop Woodcrafting Labour (Batch 1)', amt: 48000, analytic: analyticPune, bank: 'BANK', accBank: accMap['1002'] },
    { acc: accMap['5002'], name: 'Upholstery Fitting & Polishing Labour (Batch 2)', amt: 52000, analytic: analyticPune, bank: 'BANK', accBank: accMap['1002'] },
    { acc: accMap['5008'], name: 'AutoCAD & SketchUp 3D Annual Design Licenses', amt: 28000, analytic: analyticPune, bank: 'ICICI', accBank: accMap['1004'] },
    { acc: accMap['5008'], name: 'Showroom Cleaning & Pantry Supplies', amt: 12500, analytic: analyticPune, bank: 'CASH', accBank: accMap['1001'] },
    { acc: accMap['5009'], name: 'HDFC Payment Gateway Merchant Charges', amt: 8400, analytic: analyticPune, bank: 'BANK', accBank: accMap['1002'] },
    { acc: accMap['5009'], name: 'ICICI International Remittance Processing Fee', amt: 3500, analytic: analyticBhiwandi, bank: 'ICICI', accBank: accMap['1004'] },
    { acc: accMap['5005'], name: 'Local Tempo Delivery Charges (Pune City)', amt: 14200, analytic: analyticPune, bank: 'CASH', accBank: accMap['1001'] },
    { acc: accMap['5005'], name: 'Packaging Materials & Bubble Wrap Supplies', amt: 21500, analytic: analyticBhiwandi, bank: 'ICICI', accBank: accMap['1004'] },
    { acc: accMap['5006'], name: 'Tata Tele Business Internet Lease Line (Showroom)', amt: 6500, analytic: analyticPune, bank: 'BANK', accBank: accMap['1002'] },
    { acc: accMap['5006'], name: 'Airtel Broadband Fiber (Bhiwandi Hub)', amt: 4500, analytic: analyticBhiwandi, bank: 'ICICI', accBank: accMap['1004'] },
    { acc: accMap['5007'], name: 'Influencer Collaboration & Showroom Styling', amt: 29000, analytic: analyticPune, bank: 'SBI', accBank: accMap['1005'] },
    { acc: accMap['5008'], name: 'Office Ergonomic Testing & Certification Fee', amt: 16500, analytic: analyticGurugram, bank: 'ICICI', accBank: accMap['1004'] },
  ];

  for (let idx = 0; idx < expenseDefs.length; idx++) {
    const exp = expenseDefs[idx];
    const expDate = makeDate(30 - (idx % 28));

    await prisma.journalEntry.create({
      data: {
        entryNumber: nextJE(),
        date: expDate,
        reference: exp.name,
        journalId: jnlMap[exp.bank].id,
        status: 'POSTED',
        items: {
          create: [
            {
              accountId: exp.acc.id,
              analyticAccountId: exp.analytic.id,
              debit: exp.amt,
              credit: 0,
              label: exp.name,
            },
            {
              accountId: exp.accBank.id,
              debit: 0,
              credit: exp.amt,
              label: 'Paid via ' + exp.bank + ' A/c',
            },
          ],
        },
      },
    });
  }

  // ==========================================
  // 12. SUMMARY OF SEEDED DATA
  // ==========================================
  const uCount = await prisma.user.count();
  const cCount = await prisma.contact.count();
  const pCount = await prisma.product.count();
  const aCount = await prisma.account.count();
  const jCount = await prisma.journal.count();
  const poCount = await prisma.purchaseOrder.count();
  const poLineCount = await prisma.purchaseOrderLine.count();
  const billCount = await prisma.vendorBill.count();
  const billLineCount = await prisma.vendorBillLine.count();
  const soCount = await prisma.salesOrder.count();
  const soLineCount = await prisma.salesOrderLine.count();
  const invCount = await prisma.customerInvoice.count();
  const invLineCount = await prisma.customerInvoiceLine.count();
  const payCount = await prisma.payment.count();
  const jeCount = await prisma.journalEntry.count();
  const jiCount = await prisma.journalItem.count();
  const bCount = await prisma.budget.count();

  console.log('\n======================================================');
  console.log('✅ ENTERPRISE SEEDING COMPLETE! VERIFIED RECORD COUNTS:');
  console.log('======================================================');
  console.log('👤 Users:               ' + uCount + ' (Target: 8-12)');
  console.log('🏢 Contacts:            ' + cCount + ' (12 Vendors + 25 Customers, Target: 30-45)');
  console.log('🪑 Products:            ' + pCount + ' (Target: 40-60)');
  console.log('📑 Chart of Accounts:   ' + aCount + ' (Target: 30-50)');
  console.log('📖 Journals:            ' + jCount + ' (Target: 5-8)');
  console.log('📦 Purchase Orders:     ' + poCount + ' (Target: 30-50)');
  console.log('   └─ PO Lines:         ' + poLineCount + ' (Target: 80-120)');
  console.log('🧾 Vendor Bills:        ' + billCount + ' (Target: 30-50)');
  console.log('   └─ Bill Lines:       ' + billLineCount + ' (Target: 80-120)');
  console.log('🛒 Sales Orders:        ' + soCount + ' (Target: 40-60)');
  console.log('   └─ SO Lines:         ' + soLineCount + ' (Target: 100-150)');
  console.log('📄 Customer Invoices:   ' + invCount + ' (Target: 40-60)');
  console.log('   └─ Invoice Lines:    ' + invLineCount + ' (Target: 100-150)');
  console.log('💳 Payments:            ' + payCount + ' (Target: 50-90)');
  console.log('⚖️ Journal Entries:     ' + jeCount + ' (Target: 100+)');
  console.log('   └─ Journal Items:    ' + jiCount + ' (Target: 250+)');
  console.log('📊 Budgets:             ' + bCount + ' (Target: 4)');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
