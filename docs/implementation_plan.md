# Urban Furniture — Accounting System Implementation Plan

## Goal

Build a complete Odoo-based accounting system for Urban Furniture that demonstrates the full business workflow: **Master Data → Purchase/Sales → Bills/Invoices → Payments → Accounting Entries → Budget → Reports**

The system must be built by a **2-member team** using a **contract-first, vertical-slice approach** — integrating feature by feature, never at the end.

---

## Team Division

| Role | Member 1 — Core Accounting | Member 2 — UI + Integration |
|------|---------------------------|----------------------------|
| **Owns** | Database/Models, Business Logic, Accounting Engine, APIs, Security | Frontend Views, Dashboard, Forms, Navigation, Demo Flow, UI Polish |
| **Key Skill** | Python, Odoo ORM, Accounting Rules | XML Views, QWeb, CSS, Demo Preparation |

---

## Phase 0 — Architecture & Integration Contract *(Both Members Together)*

> **IMPORTANT:** This phase MUST be done together. It prevents the "my part works but integration fails" problem.

### Tasks

- [ ] Understand complete business flow end-to-end
- [ ] Decide Odoo module structure (`urban_furniture`)
- [ ] Decide models and relationships (see Data Model below)
- [ ] Decide which features use Odoo native modules vs custom
- [ ] Define database/model names
- [ ] Define user roles & permissions (Admin, Accountant, Contact/Portal User)
- [ ] Define workflow statuses for each transaction type
- [ ] Define sequences (SO, PO, INV, BILL numbering)
- [ ] Define integration points between models
- [ ] Create Git repository with shared structure
- [ ] Define branch strategy (`main`, `member1-backend`, `member2-frontend`)
- [ ] Define common coding conventions

### Output: `ARCHITECTURE.md`

Must answer:
- Who owns what model?
- Which model connects to which?
- Which field names are fixed?
- Which method creates what?
- What does Member 1 expose to Member 2?
- What does Member 2 expect from Member 1?

### Proposed Module Structure

```
urban_furniture/
├── __init__.py
├── __manifest__.py
├── models/
│   ├── __init__.py
│   ├── contact.py
│   ├── product.py
│   ├── chart_of_accounts.py
│   ├── journal.py
│   ├── journal_entry.py
│   ├── sales_order.py
│   ├── purchase_order.py
│   ├── invoice.py
│   ├── bill.py
│   ├── payment.py
│   ├── analytic_account.py
│   └── budget.py
├── views/
│   ├── contact_views.xml
│   ├── product_views.xml
│   ├── coa_views.xml
│   ├── journal_views.xml
│   ├── journal_entry_views.xml
│   ├── sales_views.xml
│   ├── purchase_views.xml
│   ├── invoice_views.xml
│   ├── bill_views.xml
│   ├── payment_views.xml
│   ├── budget_views.xml
│   ├── dashboard_views.xml
│   └── menu_views.xml
├── security/
│   ├── ir.model.access.csv
│   └── security_groups.xml
├── data/
│   ├── sequence_data.xml
│   ├── coa_data.xml
│   └── journal_data.xml
├── reports/
│   ├── balance_sheet.xml
│   ├── profit_loss.xml
│   └── budget_report.xml
├── static/
│   └── src/
│       ├── css/
│       └── js/
├── ARCHITECTURE.md
├── CONTRACT.md
└── README.md
```

### Proposed Data Model (ER Diagram)

```
CONTACT
  id, name, type (customer/vendor/both), email, mobile,
  city, state, pincode, profile_image

PRODUCT
  id, name, type (goods/service/combo), sales_price, cost_price, category

CHART_OF_ACCOUNTS
  id, name, type (asset/liability/expense/income/capital)

JOURNAL
  id, name, type (sales/purchase/bank/cash),
  default_debit_account_id, default_credit_account_id

SALES_ORDER
  id, sequence, customer_id, order_date,
  status (draft/confirmed/invoiced), total

SALES_ORDER_LINE
  id, order_id, product_id, quantity, unit_price, tax_percent, subtotal

PURCHASE_ORDER
  id, sequence, vendor_id, order_date,
  status (draft/confirmed/billed), total

PURCHASE_ORDER_LINE
  id, order_id, product_id, quantity, unit_price, subtotal

INVOICE
  id, sequence, customer_id, sales_order_id,
  invoice_date, due_date, status (draft/confirmed/paid),
  total, amount_paid, amount_due

BILL
  id, sequence, vendor_id, purchase_order_id,
  bill_date, due_date, status (draft/confirmed/paid),
  total, amount_paid, amount_due

PAYMENT
  id, type (inbound/outbound), contact_id,
  invoice_id, bill_id, journal_id,
  amount, payment_date, payment_method (cash/bank)

JOURNAL_ENTRY
  id, journal_id, entry_date, reference,
  status (draft/posted/cancelled)

JOURNAL_ENTRY_LINE
  id, entry_id, account_id, contact_id, debit, credit

ANALYTIC_ACCOUNT
  id, name, type (income/expense)

BUDGET
  id, name, analytic_account_id, period_start, period_end,
  planned_amount, committed_amount, achieved_amount,
  responsible_id, status (draft/confirmed/revised/cancelled)
```

### Key Relationships

```
CONTACT         → SALES_ORDER, PURCHASE_ORDER, INVOICE, BILL, PAYMENT
PRODUCT         → SALES_ORDER_LINE, PURCHASE_ORDER_LINE
SALES_ORDER     → SALES_ORDER_LINE, INVOICE
PURCHASE_ORDER  → PURCHASE_ORDER_LINE, BILL
INVOICE         → PAYMENT
BILL            → PAYMENT
JOURNAL         → JOURNAL_ENTRY
JOURNAL_ENTRY   → JOURNAL_ENTRY_LINE
COA             → JOURNAL_ENTRY_LINE
ANALYTIC_ACCT   → BUDGET
```

---

## Phase 1 — Project / Odoo Module Foundation

### Member 1 — Backend Foundation
- [ ] Create custom Odoo module (`urban_furniture`)
- [ ] Write `__manifest__.py` with dependencies
- [ ] Set up Python model structure (all `__init__.py` files)
- [ ] Define security groups: `uf_admin`, `uf_accountant`, `uf_portal_user`
- [ ] Define access rights in `ir.model.access.csv`
- [ ] Create sequence definitions (SO, PO, INV, BILL numbering)
- [ ] Set up base configuration data

### Member 2 — UI Foundation
- [ ] Create menu structure (top-level + sub-menus)
- [ ] Define action definitions for all menu items
- [ ] Create placeholder views (empty form/list/kanban for each model)
- [ ] Build dashboard skeleton view
- [ ] Set up navigation flow between modules
- [ ] Apply basic styling/branding

### Integration Checkpoint
```
Odoo starts → Module installs → Menus appear → Permissions work
```

---

## Phase 2 — Master Data

### Member 1 — Models
- [ ] `uf.contact` — Name, Type (customer/vendor/both), Email, Mobile, Address, Profile Image
- [ ] `uf.product` — Name, Type (goods/service/combo), Sales Price, Cost Price, Category
- [ ] `uf.chart.of.accounts` — Account Name, Type (Asset/Liability/Expense/Income/Capital)
- [ ] `uf.journal` — Journal Name, Type (sales/purchase/bank/cash), Default Accounts
- [ ] `uf.analytic.account` — Name, Type (income/expense)
- [ ] Seed default CoA: Cash, Bank, Debtors, Creditors, Sale Income, Purchase Expense
- [ ] Seed default Journals: Sales, Purchase, Bank, Cash

### Member 2 — Views
- [ ] Contact: Form + List + Kanban view
- [ ] Product: Form + List + Kanban view
- [ ] Chart of Accounts: Form + List view (grouped by type)
- [ ] Journal: Form + List view
- [ ] Analytic Account: Form + List view
- [ ] Buttons: `New`, `Confirm`, `Back` on all forms (matching mockup)

### Integration Checkpoint
```
Create Azure Furniture (Vendor) → Verify in DB
Create Office Chair (Product) → Verify in DB
```

---

## Phase 3 — Sales Flow

### Member 1 — Business Logic
- [ ] `uf.sales.order` model with sequence (SO0001...)
- [ ] `uf.sales.order.line` model (product, qty, price, tax, subtotal)
- [ ] `uf.invoice` model with sequence (INV0001...)
- [ ] Auto-compute: subtotals, tax, order total
- [ ] Status: Draft → Confirmed → Invoiced
- [ ] `action_confirm()` — Confirm SO
- [ ] `action_create_invoice()` — Generate Invoice from SO
- [ ] Invoice status: Draft → Confirmed → Paid
- [ ] `action_register_payment()` — Create payment + journal entry
- [ ] Journal Entry on payment:
  - Debit: Cash/Bank A/C
  - Credit: Debtor A/C
- [ ] Debit = Credit validation

### Member 2 — UI
- [ ] Sales Order form (Customer + Order lines with Product/Qty/Price/Tax)
- [ ] Sales Order list with status filters
- [ ] Invoice form (auto-filled from SO)
- [ ] Invoice list view
- [ ] Payment wizard (select Cash/Bank journal)
- [ ] Buttons: Confirm SO, Create Invoice, Register Payment
- [ ] Status bar on forms
- [ ] Navigation: SO → Invoice → Payment

### Integration Checkpoint — CRITICAL
```
**DO NOT MOVE TO PHASE 4 UNTIL THIS WORKS COMPLETELY**

Nimesh Pathak (Customer)
  → Sales Order (5 Office Chairs × ₹2000 + Tax)
  → Confirm SO
  → Create Invoice
  → Confirm Invoice
  → Register Payment (Cash/Bank)
  → Journal Entry: Debit Cash, Credit Debtor
  → Invoice status = "Paid" ✅
```

---

## Phase 4 — Purchase Flow

### Member 1 — Business Logic
- [ ] `uf.purchase.order` model with sequence (PO0001...)
- [ ] `uf.purchase.order.line` model
- [ ] `uf.bill` model with sequence (BILL0001...)
- [ ] Auto-compute: subtotals, total
- [ ] Status: Draft → Confirmed → Billed
- [ ] `action_confirm()` — Confirm PO
- [ ] `action_create_bill()` — Generate Vendor Bill from PO
- [ ] Bill status: Draft → Confirmed → Paid
- [ ] `action_register_payment()` — Create payment + journal entry
- [ ] Journal Entry:
  - On Bill:    Debit Purchase Expense / Credit Creditor
  - On Payment: Debit Creditor / Credit Cash or Bank

### Member 2 — UI
- [ ] Purchase Order form (Vendor + Order lines)
- [ ] Purchase Order list with status filters
- [ ] Vendor Bill form (auto-filled from PO)
- [ ] Bill list view
- [ ] Payment wizard
- [ ] Buttons: Confirm, Create Bill, Register Payment
- [ ] Navigation: PO → Bill → Payment

### Integration Checkpoint
```
Azure Furniture (Vendor)
  → Purchase Order (10 Wooden Chairs × ₹1500)
  → Confirm PO → Create Vendor Bill → Confirm Bill
  → Register Payment (Bank)
  → Journal Entry:
      Debit Purchase Expense ₹15,000 / Credit Creditor ₹15,000
      Debit Creditor ₹15,000 / Credit Bank ₹15,000
  → Bill status = "Paid" ✅
```

---

## Phase 5 — Budget System

### Member 1 — Business Logic
- [ ] `uf.budget` model
- [ ] Link Budget → Analytic Account
- [ ] Planned amount, Committed amount, Achieved amount
- [ ] Auto-compute: Achieved % = (Achieved / Committed) × 100
- [ ] Auto-compute: Amount to Achieve = Committed - Achieved
- [ ] Status: Draft → Confirmed → Revised → Cancelled
- [ ] `action_confirm()`, `action_revise()`, `action_cancel()`
- [ ] Link Sales/Purchase transactions to Analytic Accounts

### Member 2 — UI
- [ ] Budget form view
- [ ] Budget list view
- [ ] Budget Kanban (Achieved / Budget / Committed cards — matching mockup)
- [ ] Status bar, Revise button, Progress bar for Achieved %

### Integration Checkpoint
```
Create Budget → Link to Analytic Account
  → Transactions update Achieved Amount
  → Budget Report shows Planned vs Actual ✅
```

---

## Phase 6 — Accounting Engine

> **MOST CRITICAL PHASE — Judges will check this carefully**

### Member 1 — Core Accounting
- [ ] `uf.journal.entry` — Journal, Date, Reference, Status
- [ ] `uf.journal.entry.line` — Account, Partner, Debit, Credit
- [ ] Validation: Total Debits = Total Credits (ALWAYS)
- [ ] `action_post()`, `action_reset_draft()`, `action_cancel()`
- [ ] Auto-create journal entries from Invoice/Bill/Payment

### Accounting Rules Reference

| Transaction              | Debit                | Credit             |
|--------------------------|----------------------|--------------------|
| Sale on Credit           | Debtor A/C           | Sales Income A/C   |
| Cash Received (Customer) | Cash A/C             | Debtor A/C         |
| Purchase on Credit       | Purchase Expense A/C | Creditor A/C       |
| Payment to Vendor (Bank) | Creditor A/C         | Bank A/C           |

### Member 2 — Accounting UI
- [ ] Journal Entry list (grouped by journal)
- [ ] Journal Entry form (header + editable line items)
- [ ] Account + Partner dropdowns, Debit/Credit columns
- [ ] Balance warning if Debit ≠ Credit
- [ ] Post / Reset to Draft / Cancel buttons + Status bar

### Integration Checkpoint
```
Sale → Journal Entry → Debit = Credit ✅
Purchase → Journal Entry → Debit = Credit ✅
Manual Journal Entry → Post → Verified ✅
```

---

## Phase 7 — Reports

### Member 1 — Calculation Engine
- [ ] Balance Sheet: Assets | Liabilities | Capital (verify Assets = Liabilities + Capital)
- [ ] Profit & Loss: Income - Expenses = Net Profit
- [ ] Budget Report: Planned vs Committed vs Achieved per Analytic Account
- [ ] Date/period filtering
- [ ] Report data methods returning computed dictionaries

### Member 2 — Report UI
- [ ] Balance Sheet screen (table layout)
- [ ] Profit & Loss screen
- [ ] Budget Report screen (with variance column)
- [ ] Date range filters on all reports
- [ ] Print / PDF export
- [ ] Dashboard charts (bar/pie)

---

## Phase 8 — Authentication & Roles *(Both Members)*

- [ ] Administrator — Full access
- [ ] Accountant — Master data + Transactions + Reports
- [ ] Portal/Contact User — Own invoices/bills only + payment
- [ ] Login validation:
  - Login ID: unique, 6–12 characters
  - Email: no duplicates in DB
  - Password: uppercase + lowercase + special char + 8+ chars
- [ ] Error: "Invalid Login Id or Password"
- [ ] Sign Up → creates Portal/Contact User only
- [ ] Forgot Password flow
- [ ] Role-based menu visibility

---

## Phase 9 — Dashboard

### Member 1 — Backend Data
- [ ] Sales totals (count + amount)
- [ ] Purchase totals (count + amount)
- [ ] Receivables (unpaid invoices)
- [ ] Payables (unpaid bills)
- [ ] Net Profit, Budget utilization %

### Member 2 — Dashboard UI (matching mockup)
```
Top Nav: Sales | Purchase | Account | Report

Sales Section:
  [All: 12]  [Confirmed: 10]  [Draft: 2]        [New]

Purchase Section:
  [All: 12]  [Confirmed: 10]  [Draft: 2]        [New]

Budget Reports Section:
  [Achieved: 3]  [Budget: 2]  [Committed: 4]   [Report]
```
- [ ] Expanded nav on click (Sales Order, Invoice, Receipt / PO, Bill, Payment / Contact, Product, CoA... / Reports)

---

## Phase 10 — End-to-End Integration *(Both Members Together)*

> **This is a FAILURE-FINDING phase, not a development phase.**

### Full Story Test
```
LOGIN (Admin)
  → Create Contact: Azure Furniture (Vendor)
  → Create Contact: Nimesh Pathak (Customer)
  → Create Product: Office Chair
  → Verify CoA: Cash, Bank, Debtors, Creditors, Sale Income, Purchase Expense
  → Verify Journals: Sales, Purchase, Bank, Cash
  → Purchase Order → Vendor Bill → Payment → Journal Entry (Debit = Credit ✅)
  → Sales Order → Invoice → Payment → Journal Entry (Debit = Credit ✅)
  → Budget tracking updated
  → P&L Report correct
  → Balance Sheet balanced
  → Dashboard shows real data
  → Login as Accountant → verify access
  → Login as Portal User → verify limited access (own invoices only)
```

---

## Phase 11 — Demo Preparation *(Both Members Together)*

- [ ] Seed realistic data (3-5 contacts, 5-8 products, multiple transactions)
- [ ] Remove broken/incomplete features
- [ ] Fix UI inconsistencies
- [ ] Test every button, every permission, every calculation
- [ ] Test empty states + invalid input validation
- [ ] Prepare demo admin account
- [ ] Write demo script
- [ ] Prepare backup database + backup screenshots/video

### Demo Script Order
1. Login as Admin → Show Dashboard
2. Create Contact + Product
3. Sales Order → Invoice → Payment → View Journal Entry
4. Purchase Order → Bill → Payment → View Journal Entry
5. P&L Report → Balance Sheet → Budget Report
6. Switch to Accountant → verify access level
7. Switch to Portal User → verify limited access

---

## Phase Summary Table

| Phase | Member 1 (Backend) | Member 2 (UI) | Integration Checkpoint |
|-------|-------------------|---------------|----------------------|
| **0 — Architecture** | Both | Both | ARCHITECTURE.md done |
| **1 — Foundation** | Module, Security, Sequences | Menus, Placeholder Views | Module installs, menus appear |
| **2 — Master Data** | Contact, Product, CoA, Journal models | Form/List/Kanban views | Create real records via UI |
| **3 — Sales** | SO, Invoice, Payment, JE logic | SO/Invoice/Payment forms | Full sale workflow end-to-end |
| **4 — Purchase** | PO, Bill, Payment, JE logic | PO/Bill/Payment forms | Full purchase workflow |
| **5 — Budget** | Budget model, calculations | Budget views, Kanban | Budget tracks transactions |
| **6 — Accounting** | JE engine, Debit=Credit rule | JE form/list, balance warning | Debit = Credit verified |
| **7 — Reports** | P&L, Balance Sheet, Budget calcs | Report screens, filters, PDF | Correct reports from real data |
| **8 — Auth** | Permission rules | Login/Signup screens | 3 roles work correctly |
| **9 — Dashboard** | Data aggregation | Dashboard UI | Real data on dashboard |
| **10 — Integration** | Both | Both | Full story test passes |
| **11 — Demo** | Both | Both | Demo-ready system |

---

## Open Questions (Clarify Before Coding)

1. **Odoo Version** — Which version? (Community 17/18?)
2. **Native vs Custom** — Extend Odoo's built-in `account`/`sale`/`purchase`, or fully custom?
3. **Tax Handling** — Fixed % (18% GST) or configurable per product?
4. **Hackathon Duration** — Total hours? Affects phase prioritization.
5. **Deployment** — Local Odoo instance or cloud for demo?

---

## Verification Plan

### Automated
- Unit tests: Debit = Credit validation
- Test SO → Invoice → Payment programmatically
- Test PO → Bill → Payment programmatically

### Manual
- Complete Phase 10 end-to-end story test
- Role-based access: Admin / Accountant / Portal User
- Dashboard data accuracy
- Report calculation cross-check
