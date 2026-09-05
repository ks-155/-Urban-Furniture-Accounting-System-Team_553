# Urban Furniture — Architecture Decision Record

## 1. System Overview & Tech Stack

| Layer | Technology | Owner |
|---|---|---|
| **Frontend** | React.js + Tailwind CSS | Member 2 |
| **Backend API** | Node.js + Express.js | Member 1 (You) |
| **Database & ORM** | PostgreSQL + Prisma ORM | Member 1 (You) |
| **API Architecture** | RESTful JSON API | Shared Contract (`CONTRACT.md`) |

---

## 2. Project Directory Structure

```
urban-furniture/
├── backend/                  # Owned by Member 1
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema & relations
│   │   └── seed.js           # Default CoA, Journals, Admin User
│   ├── src/
│   │   ├── controllers/      # Route logic (auth, contacts, sales, purchases, etc.)
│   │   ├── routes/           # Express router endpoints
│   │   ├── services/         # Accounting engine, validation, report calculations
│   │   ├── middlewares/      # Auth & role verification, error handlers
│   │   └── app.js            # Express app entrypoint
│   ├── .env.example
│   └── package.json
│
├── frontend/                 # Owned by Member 2
│   ├── src/
│   │   ├── components/       # UI Cards, Modals, Navbar, Sidebar
│   │   ├── pages/            # Dashboard, Sales, Purchases, CoA, Reports, Login
│   │   ├── services/api.js   # Fetch/Axios calls matching CONTRACT.md
│   │   └── App.jsx
│   └── package.json
│
├── docs/                     # Project specs & blueprints
│   ├── ARCHITECTURE.md
│   ├── CONTRACT.md
│   ├── implementation_plan.md
│   └── task.md
├── README.md
└── .gitignore
```

---

## 3. Database Schema (Prisma Models)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  ACCOUNTANT
  USER
}

enum ContactType {
  CUSTOMER
  VENDOR
  BOTH
}

enum ProductType {
  GOODS
  SERVICE
  COMBO
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

enum JournalType {
  SALES
  PURCHASE
  BANK
  CASH
}

enum OrderStatus {
  DRAFT
  CONFIRMED
  INVOICED
  BILLED
  CANCELLED
}

enum InvoiceStatus {
  DRAFT
  CONFIRMED
  PAID
  CANCELLED
}

enum EntryStatus {
  DRAFT
  POSTED
  CANCELLED
}

enum BudgetStatus {
  DRAFT
  CONFIRMED
  REVISED
  CANCELLED
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  loginId   String   @unique
  email     String   @unique
  password  String
  role      Role     @default(USER)
  contactId Int?     @unique
  contact   Contact? @relation(fields: [contactId], references: [id])
  createdAt DateTime @default(now())
}

model Contact {
  id        Int         @id @default(autoincrement())
  name      String
  type      ContactType @default(CUSTOMER)
  email     String      @unique
  mobile    String?
  city      String?
  state     String?
  pincode   String?
  image     String?
  user      User?
  sales     SalesOrder[]
  purchases PurchaseOrder[]
  invoices  Invoice[]
  bills     Bill[]
  payments  Payment[]
  createdAt DateTime    @default(now())
}

model Product {
  id         Int         @id @default(autoincrement())
  name       String
  type       ProductType @default(GOODS)
  salesPrice Float
  costPrice  Float
  category   String?
  createdAt  DateTime    @default(now())
  soLines    SalesOrderLine[]
  poLines    PurchaseOrderLine[]
}

model ChartOfAccount {
  id           Int         @id @default(autoincrement())
  code         String      @unique
  name         String
  accountType  AccountType
  journalLines JournalEntryLine[]
  debitJournals  Journal[] @relation("DefaultDebit")
  creditJournals Journal[] @relation("DefaultCredit")
}

model Journal {
  id                    Int          @id @default(autoincrement())
  name                  String
  type                  JournalType
  defaultDebitAccountId  Int?
  defaultCreditAccountId Int?
  defaultDebitAccount   ChartOfAccount? @relation("DefaultDebit", fields: [defaultDebitAccountId], references: [id])
  defaultCreditAccount  ChartOfAccount? @relation("DefaultCredit", fields: [defaultCreditAccountId], references: [id])
  entries               JournalEntry[]
  payments              Payment[]
}

model SalesOrder {
  id          Int              @id @default(autoincrement())
  orderNumber String           @unique // SO0001
  customerId  Int
  customer    Contact          @relation(fields: [customerId], references: [id])
  orderDate   DateTime         @default(now())
  status      OrderStatus      @default(DRAFT)
  totalAmount Float            @default(0.0)
  lines       SalesOrderLine[]
  invoice     Invoice?
  createdAt   DateTime         @default(now())
}

model SalesOrderLine {
  id         Int        @id @default(autoincrement())
  orderId    Int
  order      SalesOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId  Int
  product    Product    @relation(fields: [productId], references: [id])
  quantity   Float      @default(1.0)
  unitPrice  Float
  taxPercent Float      @default(18.0)
  subtotal   Float
}

model PurchaseOrder {
  id          Int                 @id @default(autoincrement())
  orderNumber String              @unique // PO0001
  vendorId    Int
  vendor      Contact             @relation(fields: [vendorId], references: [id])
  orderDate   DateTime            @default(now())
  status      OrderStatus         @default(DRAFT)
  totalAmount Float               @default(0.0)
  lines       PurchaseOrderLine[]
  bill        Bill?
  createdAt   DateTime            @default(now())
}

model PurchaseOrderLine {
  id        Int           @id @default(autoincrement())
  orderId   Int
  order     PurchaseOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId Int
  product   Product       @relation(fields: [productId], references: [id])
  quantity  Float         @default(1.0)
  unitPrice Float
  subtotal  Float
}

model Invoice {
  id             Int           @id @default(autoincrement())
  invoiceNumber  String        @unique // INV0001
  customerId     Int
  customer       Contact       @relation(fields: [customerId], references: [id])
  salesOrderId   Int?          @unique
  salesOrder     SalesOrder?   @relation(fields: [salesOrderId], references: [id])
  invoiceDate    DateTime      @default(now())
  dueDate        DateTime?
  status         InvoiceStatus @default(DRAFT)
  totalAmount    Float
  amountPaid     Float         @default(0.0)
  amountDue      Float
  journalEntryId Int?          @unique
  journalEntry   JournalEntry? @relation(fields: [journalEntryId], references: [id])
  payments       Payment[]
  createdAt      DateTime      @default(now())
}

model Bill {
  id              Int           @id @default(autoincrement())
  billNumber      String        @unique // BILL0001
  vendorId        Int
  vendor          Contact       @relation(fields: [vendorId], references: [id])
  purchaseOrderId Int?          @unique
  purchaseOrder   PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])
  billDate        DateTime      @default(now())
  dueDate         DateTime?
  status          InvoiceStatus @default(DRAFT)
  totalAmount     Float
  amountPaid      Float         @default(0.0)
  amountDue       Float
  journalEntryId  Int?          @unique
  journalEntry    JournalEntry? @relation(fields: [journalEntryId], references: [id])
  payments        Payment[]
  createdAt       DateTime      @default(now())
}

model Payment {
  id            Int           @id @default(autoincrement())
  paymentNumber String        @unique // PAY0001
  paymentType   String        // "INBOUND" (Sale) or "OUTBOUND" (Purchase)
  contactId     Int
  contact       Contact       @relation(fields: [contactId], references: [id])
  invoiceId     Int?
  invoice       Invoice?      @relation(fields: [invoiceId], references: [id])
  billId        Int?
  bill          Bill?         @relation(fields: [billId], references: [id])
  journalId     Int
  journal       Journal       @relation(fields: [journalId], references: [id])
  amount        Float
  paymentDate   DateTime      @default(now())
  paymentMethod String        // "CASH" | "BANK"
  journalEntryId Int?         @unique
  journalEntry  JournalEntry? @relation(fields: [journalEntryId], references: [id])
}

model JournalEntry {
  id          Int                @id @default(autoincrement())
  entryNumber String             @unique // JE0001
  journalId   Int
  journal     Journal            @relation(fields: [journalId], references: [id])
  entryDate   DateTime           @default(now())
  reference   String?
  status      EntryStatus        @default(DRAFT)
  lines       JournalEntryLine[]
  invoice     Invoice?
  bill        Bill?
  payment     Payment?
  createdAt   DateTime           @default(now())
}

model JournalEntryLine {
  id          Int            @id @default(autoincrement())
  entryId     Int
  entry       JournalEntry   @relation(fields: [entryId], references: [id], onDelete: Cascade)
  accountId   Int
  account     ChartOfAccount @relation(fields: [accountId], references: [id])
  label       String?
  debit       Float          @default(0.0)
  credit      Float          @default(0.0)
}

model AnalyticAccount {
  id      Int      @id @default(autoincrement())
  name    String
  type    String   // "INCOME" | "EXPENSE"
  budgets Budget[]
}

model Budget {
  id                Int             @id @default(autoincrement())
  name              String
  analyticAccountId Int
  analyticAccount   AnalyticAccount @relation(fields: [analyticAccountId], references: [id])
  periodStart       DateTime
  periodEnd         DateTime
  plannedAmount     Float
  committedAmount   Float
  achievedAmount    Float           @default(0.0)
  responsiblePerson String
  status            BudgetStatus    @default(DRAFT)
  createdAt         DateTime        @default(now())
}
```

---

## 4. Double-Entry Rules Enforced in Node.js Services

1. **Credit Sale (Invoice Confirmed)**:
   - Debit: `Debtors` (Asset)
   - Credit: `Sales Income` (Income)
2. **Payment Received for Invoice**:
   - Debit: `Cash` or `Bank` (Asset)
   - Credit: `Debtors` (Asset)
3. **Credit Purchase (Bill Confirmed)**:
   - Debit: `Purchase Expense` (Expense)
   - Credit: `Creditors` (Liability)
4. **Payment Sent for Bill**:
   - Debit: `Creditors` (Liability)
   - Credit: `Cash` or `Bank` (Asset)

**Golden Law:** `sum(line.debit) === sum(line.credit)` for every posted entry.
