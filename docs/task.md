# Urban Furniture — Task Tracker

## Phase 0 — Architecture & Contract *(Both)*
- [ ] Complete business flow walkthrough together
- [ ] Finalize Odoo module structure
- [ ] Agree on all model names and field names
- [ ] Define user roles & permissions
- [ ] Define workflow statuses (Draft/Confirmed/Paid etc.)
- [ ] Define sequences (SO0001, PO0001, INV0001, BILL0001)
- [ ] Create GitHub repository
- [ ] Set branch strategy (main / member1-backend / member2-frontend)
- [ ] Define coding conventions
- [ ] Complete ARCHITECTURE.md
- [ ] Complete CONTRACT.md

## Phase 1 — Module Foundation
### Member 1
- [ ] Create `urban_furniture` Odoo module
- [ ] Write `__manifest__.py`
- [ ] Set up all `__init__.py` files
- [ ] Define security groups (uf_admin, uf_accountant, uf_portal_user)
- [ ] Create `ir.model.access.csv`
- [ ] Create sequence data XML

### Member 2
- [ ] Create top-level menu structure
- [ ] Define action records
- [ ] Create placeholder views (form/list/kanban)
- [ ] Build dashboard skeleton
- [ ] Set up navigation

### Checkpoint ✅
- [ ] Module installs without errors
- [ ] All menus appear
- [ ] Permissions work per role

## Phase 2 — Master Data
### Member 1
- [ ] `uf.contact` model
- [ ] `uf.product` model
- [ ] `uf.chart.of.accounts` model
- [ ] `uf.journal` model
- [ ] `uf.analytic.account` model
- [ ] Seed default CoA data
- [ ] Seed default Journal data

### Member 2
- [ ] Contact: Form + List + Kanban view
- [ ] Product: Form + List + Kanban view
- [ ] Chart of Accounts: Form + List view
- [ ] Journal: Form + List view
- [ ] Analytic Account: Form + List view

### Checkpoint ✅
- [ ] Create Azure Furniture (Vendor) via UI
- [ ] Create Office Chair (Product) via UI
- [ ] Records visible in Python shell

## Phase 3 — Sales Flow
### Member 1
- [ ] `uf.sales.order` model
- [ ] `uf.sales.order.line` model
- [ ] `uf.invoice` model
- [ ] Auto-compute totals
- [ ] `action_confirm()`
- [ ] `action_create_invoice()`
- [ ] `action_register_payment()`
- [ ] Journal Entry auto-creation on payment
- [ ] Debit = Credit validation

### Member 2
- [ ] Sales Order form view
- [ ] Sales Order list view (with status filter)
- [ ] Invoice form view
- [ ] Invoice list view
- [ ] Payment wizard
- [ ] Confirm / Create Invoice / Register Payment buttons
- [ ] Status bar on SO and Invoice
- [ ] SO → Invoice → Payment navigation

### Checkpoint ✅ (DO NOT SKIP)
- [ ] Nimesh Pathak → SO (5 Office Chairs) → Invoice → Payment → Journal Entry
- [ ] Invoice status = Paid
- [ ] Debit = Credit verified

## Phase 4 — Purchase Flow
### Member 1
- [ ] `uf.purchase.order` model
- [ ] `uf.purchase.order.line` model
- [ ] `uf.bill` model
- [ ] `action_confirm()`
- [ ] `action_create_bill()`
- [ ] `action_register_payment()`
- [ ] Journal Entry auto-creation
- [ ] Debit = Credit validation

### Member 2
- [ ] Purchase Order form view
- [ ] Purchase Order list view
- [ ] Vendor Bill form view
- [ ] Bill list view
- [ ] Payment wizard
- [ ] All action buttons
- [ ] PO → Bill → Payment navigation

### Checkpoint ✅
- [ ] Azure Furniture → PO → Bill → Payment → Journal Entry
- [ ] Bill status = Paid
- [ ] Debit = Credit verified

## Phase 5 — Budget System
### Member 1
- [ ] `uf.budget` model
- [ ] Link Budget → Analytic Account
- [ ] Achieved % auto-compute
- [ ] Amount to Achieve auto-compute
- [ ] Status workflow methods

### Member 2
- [ ] Budget form view
- [ ] Budget list view
- [ ] Budget Kanban view
- [ ] Progress bar for Achieved %

### Checkpoint ✅
- [ ] Budget tracks transaction amounts
- [ ] Budget Report shows Planned vs Actual

## Phase 6 — Accounting Engine
### Member 1
- [ ] `uf.journal.entry` model
- [ ] `uf.journal.entry.line` model
- [ ] Debit = Credit validation (hard constraint)
- [ ] `action_post()`
- [ ] `action_reset_draft()`
- [ ] `action_cancel()`

### Member 2
- [ ] Journal Entry list view
- [ ] Journal Entry form view (with editable lines)
- [ ] Account + Partner dropdowns
- [ ] Balance warning UI
- [ ] Post / Reset / Cancel buttons

### Checkpoint ✅
- [ ] Sale → Journal Entry → Debit = Credit
- [ ] Purchase → Journal Entry → Debit = Credit
- [ ] Manual JE → Post → Verified

## Phase 7 — Reports
### Member 1
- [ ] Balance Sheet calculation
- [ ] P&L calculation
- [ ] Budget Report calculation
- [ ] Date filter support

### Member 2
- [ ] Balance Sheet screen
- [ ] P&L screen
- [ ] Budget Report screen
- [ ] Date range filter UI
- [ ] Print / PDF

### Checkpoint ✅
- [ ] Reports show correct figures from real transactions

## Phase 8 — Authentication & Roles
### Both
- [ ] Admin role — full access
- [ ] Accountant role — master data + transactions + reports
- [ ] Portal User — own invoices/bills + payment only
- [ ] Login validation
- [ ] Sign Up flow (creates Portal User)
- [ ] Forgot Password

### Checkpoint ✅
- [ ] All 3 roles work as expected

## Phase 9 — Dashboard
### Member 1
- [ ] Sales totals API
- [ ] Purchase totals API
- [ ] Receivables/Payables
- [ ] Net Profit
- [ ] Budget utilization

### Member 2
- [ ] Dashboard top nav
- [ ] Sales/Purchase/Budget cards
- [ ] Expanded nav menu
- [ ] Charts

### Checkpoint ✅
- [ ] Dashboard shows real live data

## Phase 10 — End-to-End Integration *(Both)*
- [ ] Full story test (see implementation_plan.md Phase 10)
- [ ] All journal entries balanced
- [ ] All reports correct
- [ ] All 3 roles verified

## Phase 11 — Demo Prep *(Both)*
- [ ] Seed realistic data
- [ ] Fix all broken features
- [ ] Polish UI
- [ ] Test all buttons / permissions / calculations
- [ ] Write demo script
- [ ] Backup database
- [ ] Backup screenshots/video
