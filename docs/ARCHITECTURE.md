# Urban Furniture — Architecture Decision Record

> Fill this document together in Phase 0 before writing any code.

---

## 1. Module Info

| Key | Value |
|-----|-------|
| Module Name | `urban_furniture` |
| Odoo Version | *(fill in)* |
| Approach | *(Custom models / Extend native modules)* |
| Database | PostgreSQL (Odoo default) |

---

## 2. Team Ownership

| Owner | Responsible For |
|-------|----------------|
| Member 1 | All Python models, business logic, accounting rules, security, sequences |
| Member 2 | All XML views, menus, QWeb reports, dashboard, UI polish, demo |

---

## 3. Fixed Model Names

| Model | Python Class | DB Table |
|-------|-------------|----------|
| Contact | `uf.contact` | `uf_contact` |
| Product | `uf.product` | `uf_product` |
| Chart of Accounts | `uf.chart.of.accounts` | `uf_chart_of_accounts` |
| Journal | `uf.journal` | `uf_journal` |
| Journal Entry | `uf.journal.entry` | `uf_journal_entry` |
| Journal Entry Line | `uf.journal.entry.line` | `uf_journal_entry_line` |
| Sales Order | `uf.sales.order` | `uf_sales_order` |
| Sales Order Line | `uf.sales.order.line` | `uf_sales_order_line` |
| Purchase Order | `uf.purchase.order` | `uf_purchase_order` |
| Purchase Order Line | `uf.purchase.order.line` | `uf_purchase_order_line` |
| Invoice | `uf.invoice` | `uf_invoice` |
| Bill | `uf.bill` | `uf_bill` |
| Payment | `uf.payment` | `uf_payment` |
| Analytic Account | `uf.analytic.account` | `uf_analytic_account` |
| Budget | `uf.budget` | `uf_budget` |

---

## 4. Fixed Field Names (Do Not Change After Agreement)

### uf.contact
```
name, type (customer/vendor/both), email, mobile,
city, state, pincode, profile_image
```

### uf.product
```
name, type (goods/service/combo), sales_price, cost_price, category
```

### uf.chart.of.accounts
```
name, account_type (asset/liability/expense/income/capital)
```

### uf.journal
```
name, journal_type (sales/purchase/bank/cash),
default_debit_account_id, default_credit_account_id
```

### uf.sales.order
```
name (sequence), customer_id, order_date, state, total_amount
line_ids (One2many → uf.sales.order.line)
invoice_id (Many2one → uf.invoice)
```

### uf.sales.order.line
```
order_id, product_id, quantity, unit_price, tax_percent, subtotal
```

### uf.purchase.order
```
name (sequence), vendor_id, order_date, state, total_amount
line_ids (One2many → uf.purchase.order.line)
bill_id (Many2one → uf.bill)
```

### uf.purchase.order.line
```
order_id, product_id, quantity, unit_price, subtotal
```

### uf.invoice
```
name (sequence), customer_id, sales_order_id,
invoice_date, due_date, state, total_amount, amount_paid, amount_due
```

### uf.bill
```
name (sequence), vendor_id, purchase_order_id,
bill_date, due_date, state, total_amount, amount_paid, amount_due
```

### uf.payment
```
payment_type (inbound/outbound), contact_id,
invoice_id, bill_id, journal_id, amount, payment_date,
payment_method (cash/bank)
```

### uf.journal.entry
```
journal_id, entry_date, reference, state (draft/posted/cancelled)
line_ids (One2many → uf.journal.entry.line)
```

### uf.journal.entry.line
```
entry_id, account_id, contact_id, debit, credit
```

### uf.budget
```
name, analytic_account_id, period_start, period_end,
planned_amount, committed_amount, achieved_amount,
achieved_percent (computed), amount_to_achieve (computed),
responsible_id, state (draft/confirmed/revised/cancelled)
```

---

## 5. Fixed Workflow States

| Model | States |
|-------|--------|
| Sales Order | `draft` → `confirmed` → `invoiced` |
| Purchase Order | `draft` → `confirmed` → `billed` |
| Invoice | `draft` → `confirmed` → `paid` |
| Bill | `draft` → `confirmed` → `paid` |
| Journal Entry | `draft` → `posted` → `cancelled` |
| Budget | `draft` → `confirmed` → `revised` → `cancelled` |

---

## 6. Sequences

| Prefix | Example | Model |
|--------|---------|-------|
| `SO` | SO0001 | Sales Order |
| `PO` | PO0001 | Purchase Order |
| `INV` | INV0001 | Invoice |
| `BILL` | BILL0001 | Bill |
| `JE` | JE0001 | Journal Entry |

---

## 7. Security Groups

| Group | XML ID | Access |
|-------|--------|--------|
| Administrator | `uf_admin` | Full CRUD on all models |
| Accountant | `uf_accountant` | Full CRUD on master + transactions + reports |
| Portal User | `uf_portal_user` | Read own invoices/bills only + register payment |

---

## 8. Method Contracts (Member 1 exposes → Member 2 calls from buttons)

| Method | Model | Triggered By | Does |
|--------|-------|-------------|------|
| `action_confirm()` | `uf.sales.order` | Confirm button | Sets state = confirmed |
| `action_create_invoice()` | `uf.sales.order` | Create Invoice button | Creates `uf.invoice` record from SO |
| `action_confirm()` | `uf.invoice` | Confirm button | Sets state = confirmed, creates JE |
| `action_register_payment()` | `uf.invoice` | Register Payment button | Creates `uf.payment` + JE |
| `action_confirm()` | `uf.purchase.order` | Confirm button | Sets state = confirmed |
| `action_create_bill()` | `uf.purchase.order` | Create Bill button | Creates `uf.bill` record from PO |
| `action_confirm()` | `uf.bill` | Confirm button | Sets state = confirmed, creates JE |
| `action_register_payment()` | `uf.bill` | Register Payment button | Creates `uf.payment` + JE |
| `action_post()` | `uf.journal.entry` | Post button | Validates Debit=Credit, sets state=posted |
| `action_reset_draft()` | `uf.journal.entry` | Reset button | Sets state=draft |
| `action_cancel()` | `uf.journal.entry` | Cancel button | Sets state=cancelled |
| `action_confirm()` | `uf.budget` | Confirm button | Sets state=confirmed |
| `action_revise()` | `uf.budget` | Revise button | Sets state=revised |

---

## 9. Accounting Rules (Member 1 implements — both must understand)

| Transaction | Debit | Credit |
|-------------|-------|--------|
| Sale on Credit (Invoice Confirm) | Debtor A/C | Sales Income A/C |
| Cash/Bank Received from Customer | Cash/Bank A/C | Debtor A/C |
| Purchase on Credit (Bill Confirm) | Purchase Expense A/C | Creditor A/C |
| Cash/Bank Paid to Vendor | Creditor A/C | Cash/Bank A/C |

**Golden Rule: Debit must ALWAYS equal Credit. No exceptions.**

---

## 10. Default Chart of Accounts (Seeded Data)

| Account Name | Type |
|-------------|------|
| Cash | Asset |
| Bank | Asset |
| Debtors | Asset |
| Creditors | Liability |
| Sales Income | Income |
| Purchase Expense | Expense |

---

## 11. Default Journals (Seeded Data)

| Journal | Type | Default Debit A/C | Default Credit A/C |
|---------|------|------------------|-------------------|
| Sales Journal | sales | Debtors | Sales Income |
| Purchase Journal | purchase | Purchase Expense | Creditors |
| Bank Journal | bank | Bank | Bank |
| Cash Journal | cash | Cash | Cash |

---

## 12. Integration Points (Member 2 connects here)

- **Menu action** → opens list/form view of the correct model
- **Confirm button** → calls `action_confirm()` on current record
- **Create Invoice button** → calls `action_create_invoice()` → opens new invoice form
- **Register Payment button** → opens payment wizard → calls `action_register_payment()`
- **Post button** (Journal Entry) → calls `action_post()` → checks balance
- **Report page** → reads computed data from report calculation methods

---

## Open Decisions *(Fill Before Coding)*

- [ ] Odoo version confirmed: __________
- [ ] Custom or extend native: __________
- [ ] Tax: Fixed 18% or configurable: __________
- [ ] Hackathon total hours: __________
- [ ] Deployment: Local or cloud: __________
