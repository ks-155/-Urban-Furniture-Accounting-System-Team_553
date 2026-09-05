# Urban Furniture — Implementation Plan (Node.js + React Stack)

## Goal

Build a complete web-based Accounting System for Urban Furniture showcasing the full end-to-end business workflow:
**Master Data → Purchase/Sales → Bills/Invoices → Payments → Accounting Entries → Budget → Reports**

---

## Architecture & Tech Stack

| Layer | Technology | Owner |
|---|---|---|
| **🎨 Frontend** | React.js + Tailwind CSS | Member 2 |
| **⚙️ Backend** | Node.js + Express.js | Member 1 (You) |
| **🗄️ Database** | PostgreSQL + Prisma ORM | Member 1 (You) |
| **🔗 Contract** | RESTful JSON API (`docs/CONTRACT.md`) | Both Members |

---

## Phase Breakdown

### Phase 0 — Architecture & Contract Setup *(Completed)*
- [x] Tech stack defined (React + Tailwind, Node + Express, Postgres + Prisma)
- [x] Database schema designed with Prisma models (`docs/ARCHITECTURE.md`)
- [x] RESTful API endpoints and JSON payloads defined (`docs/CONTRACT.md`)
- [x] Git repository configured & pushed to `main`

### Phase 1 — Project Foundation & Scaffolding
* **Member 1 (Backend):**
  - Setup `backend/` project with `npm init -y`
  - Install dependencies (`express`, `prisma`, `@prisma/client`, `cors`, `dotenv`, `bcryptjs`, `jsonwebtoken`)
  - Initialize Prisma schema and database connection
  - Create seed script for default Chart of Accounts, Journals, and Admin user
* **Member 2 (Frontend):**
  - Initialize `frontend/` with Vite + React + Tailwind CSS
  - Configure Axios/Fetch API client pointed to `http://localhost:5000/api`
  - Setup routing & dashboard layout matching the Excalidraw mockup

### Phase 2 — Master Data (Contacts, Products, CoA, Journals)
* **Member 1:**
  - Create CRUD endpoints for `/api/contacts`, `/api/products`, `/api/accounts`, `/api/journals`
  - Seed initial data: Azure Furniture (Vendor), Nimesh Pathak (Customer), Office Chair (Product)
* **Member 2:**
  - Master data list and form views (matching mockup New/Confirm/Back buttons)
* **Integration Checkpoint:** Create contact & product via UI, verify in PostgreSQL via Prisma Studio.

### Phase 3 — Sales Flow (SO → Invoice → Payment → Accounting)
* **Member 1:**
  - `POST /api/sales` (SO creation with line items & tax calculation)
  - `POST /api/sales/:id/confirm`
  - `POST /api/sales/:id/create-invoice`
  - `POST /api/invoices/:id/confirm` (Creates auto Journal Entry: Debit Debtors / Credit Sales Income)
  - `POST /api/invoices/:id/pay` (Creates auto Journal Entry: Debit Cash/Bank / Credit Debtors)
* **Member 2:**
  - Sales Order form, Invoice view, Register Payment modal
* **Integration Checkpoint:** End-to-end Sale of 5 Office Chairs to Nimesh Pathak → Invoice marked PAID → Journal Entry balanced.

### Phase 4 — Purchase Flow (PO → Bill → Payment → Accounting)
* **Member 1:**
  - `POST /api/purchases` (PO creation with vendor & lines)
  - `POST /api/purchases/:id/confirm`
  - `POST /api/purchases/:id/create-bill`
  - `POST /api/bills/:id/confirm` (Creates auto Journal Entry: Debit Purchase Expense / Credit Creditors)
  - `POST /api/bills/:id/pay` (Creates auto Journal Entry: Debit Creditors / Credit Bank)
* **Member 2:**
  - Purchase Order form, Vendor Bill view, Register Payment modal
* **Integration Checkpoint:** End-to-end Purchase of 10 Wooden Chairs from Azure Furniture → Bill marked PAID → Journal Entry balanced.

### Phase 5 — Budget System
* **Member 1:**
  - `POST /api/budgets` & `GET /api/budgets`
  - Dynamic computation of `achievedAmount`, `achievedPercent`, and `amountToAchieve`
* **Member 2:**
  - Budget Kanban view (Achieved / Budget / Committed cards)
* **Integration Checkpoint:** Purchase & Sales transactions reflect dynamically in Budget progress.

### Phase 6 — Double-Entry Accounting Engine
* **Member 1:**
  - `/api/journal-entries` listing and manual posting
  - Strict validator: `totalDebit === totalCredit` (fails with error if unbalanced)
* **Member 2:**
  - Journal Entries table, line item viewer, Debit vs Credit balance indicator
* **Integration Checkpoint:** Every transaction has matching debits and credits in DB.

### Phase 7 — Financial Reports
* **Member 1:**
  - `/api/reports/balance-sheet` (Assets = Liabilities + Equity)
  - `/api/reports/profit-loss` (Income - Expenses = Net Profit)
  - `/api/reports/budget` (Planned vs Actuals)
* **Member 2:**
  - Financial report tables with date filters and print/PDF view

### Phase 8 — Authentication & Role-Based Access
* **Member 1:**
  - JWT auth middleware (`/api/auth/login`, `/api/auth/signup`)
  - Role enforcement: ADMIN, ACCOUNTANT, USER
* **Member 2:**
  - Login & Sign-Up screens (matching wireframes: Login ID, Email, Password rules)
  - Portal view for USER role (only viewing their own invoices & paying)

### Phase 9 — Interactive Dashboard
* **Member 1:**
  - `/api/dashboard` aggregated stats endpoint
* **Member 2:**
  - App Dashboard matching mockup cards (Sales: All/Confirmed/Draft, Purchase: All/Confirmed/Draft, Budget: Achieved/Budget/Committed)

### Phase 10 — End-to-End Integration & Demo Prep
* **Both Members:**
  - Full demo run-through: Login → Contact/Product → PO/Bill/Pay → SO/Invoice/Pay → Accounting → Reports → Dashboard.
