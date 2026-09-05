# Urban Furniture — Integration Contract (CONTRACT.md)

> **Contract between Member 1 (Backend / Accounting) and Member 2 (UI / Integration)**
> This document guarantees that backend and frontend will integrate seamlessly without breaking.

---

## 1. Model & Data Contracts

### 1.1 Contact (`uf.contact`)
| Field | Type | Required | Values / Notes | Member 1 Provides | Member 2 Displays |
|---|---|---|---|---|---|
| `name` | Char | Yes | Contact full name | Stored in DB | Text input |
| `type` | Selection | Yes | `'customer'`, `'vendor'`, `'both'` | Filter/domain rules | Radio / dropdown |
| `email` | Char | Yes | Must be valid & unique | Validation | Text input |
| `mobile` | Char | No | Phone number | Stored in DB | Text input |
| `city` | Char | No | City | Stored in DB | Text input |
| `state` | Char | No | State | Stored in DB | Text input |
| `pincode` | Char | No | PIN / Postal code | Stored in DB | Text input |
| `image_1920` | Binary | No | Image attachment | Stored in DB | Image widget |
| `user_id` | Many2one | No | `res.users` link for Portal login | User link | Only for Portal User |

---

### 1.2 Product (`uf.product`)
| Field | Type | Required | Values / Notes | Member 1 Provides | Member 2 Displays |
|---|---|---|---|---|---|
| `name` | Char | Yes | Product name | Stored in DB | Text input |
| `type` | Selection | Yes | `'goods'`, `'service'`, `'combo'` | Classification | Dropdown |
| `sales_price` | Float | Yes | Default selling price | Auto-loads into SO line | Monetary input |
| `cost_price` | Float | Yes | Purchase/cost price | Auto-loads into PO line | Monetary input |
| `category` | Char | No | Category (e.g. Chair, Table) | Stored in DB | Text input / dropdown |

---

### 1.3 Chart of Accounts (`uf.chart.of.accounts`)
| Field | Type | Required | Values / Notes |
|---|---|---|---|
| `name` | Char | Yes | e.g. "Cash", "Bank", "Debtors", "Creditors", "Sales Income", "Purchase Expense" |
| `code` | Char | Yes | Unique account code (e.g. `1001`, `2001`, `3001`, `4001`, `5001`) |
| `account_type` | Selection | Yes | `'asset'`, `'liability'`, `'equity'`, `'income'`, `'expense'` |

---

### 1.4 Journal (`uf.journal`)
| Field | Type | Required | Values / Notes |
|---|---|---|---|
| `name` | Char | Yes | e.g. "Customer Invoices", "Vendor Bills", "Bank", "Cash" |
| `type` | Selection | Yes | `'sales'`, `'purchase'`, `'bank'`, `'cash'` |
| `default_debit_account_id` | Many2one | No | Points to `uf.chart.of.accounts` |
| `default_credit_account_id` | Many2one | No | Points to `uf.chart.of.accounts` |

---

### 1.5 Sales Order (`uf.sales.order`) & Lines (`uf.sales.order.line`)
#### Order Header:
* `name`: Char (auto-sequence `SO0001`)
* `customer_id`: Many2one (`uf.contact`, domain: `[('type', 'in', ['customer', 'both'])]`)
* `order_date`: Date (default today)
* `state`: Selection `[('draft', 'Draft'), ('confirmed', 'Confirmed'), ('invoiced', 'Invoiced'), ('cancelled', 'Cancelled')]`
* `line_ids`: One2many (`uf.sales.order.line`)
* `total_amount`: Float (computed sum of line subtotals + tax)
* `invoice_id`: Many2one (`uf.invoice`, readonly)

#### Order Line:
* `product_id`: Many2one (`uf.product`)
* `quantity`: Float (default 1.0)
* `unit_price`: Float (auto-filled from `product_id.sales_price`)
* `tax_percent`: Float (default 18.0)
* `subtotal`: Float (computed: `quantity * unit_price * (1 + tax_percent / 100)`)

---

### 1.6 Purchase Order (`uf.purchase.order`) & Lines (`uf.purchase.order.line`)
#### Order Header:
* `name`: Char (auto-sequence `PO0001`)
* `vendor_id`: Many2one (`uf.contact`, domain: `[('type', 'in', ['vendor', 'both'])]`)
* `order_date`: Date (default today)
* `state`: Selection `[('draft', 'Draft'), ('confirmed', 'Confirmed'), ('billed', 'Billed'), ('cancelled', 'Cancelled')]`
* `line_ids`: One2many (`uf.purchase.order.line`)
* `total_amount`: Float (computed sum of line subtotals)
* `bill_id`: Many2one (`uf.bill`, readonly)

#### Order Line:
* `product_id`: Many2one (`uf.product`)
* `quantity`: Float (default 1.0)
* `unit_price`: Float (auto-filled from `product_id.cost_price`)
* `subtotal`: Float (computed: `quantity * unit_price`)

---

### 1.7 Customer Invoice (`uf.invoice`)
* `name`: Char (auto-sequence `INV0001`)
* `customer_id`: Many2one (`uf.contact`)
* `sales_order_id`: Many2one (`uf.sales.order`)
* `invoice_date`: Date
* `due_date`: Date
* `state`: Selection `[('draft', 'Draft'), ('confirmed', 'Confirmed'), ('paid', 'Paid'), ('cancelled', 'Cancelled')]`
* `total_amount`: Float
* `amount_paid`: Float
* `amount_due`: Float (computed: `total_amount - amount_paid`)
* `payment_ids`: One2many (`uf.payment`)
* `journal_entry_id`: Many2one (`uf.journal.entry`)

---

### 1.8 Vendor Bill (`uf.bill`)
* `name`: Char (auto-sequence `BILL0001`)
* `vendor_id`: Many2one (`uf.contact`)
* `purchase_order_id`: Many2one (`uf.purchase.order`)
* `bill_date`: Date
* `due_date`: Date
* `state`: Selection `[('draft', 'Draft'), ('confirmed', 'Confirmed'), ('paid', 'Paid'), ('cancelled', 'Cancelled')]`
* `total_amount`: Float
* `amount_paid`: Float
* `amount_due`: Float (computed: `total_amount - amount_paid`)
* `payment_ids`: One2many (`uf.payment`)
* `journal_entry_id`: Many2one (`uf.journal.entry`)

---

### 1.9 Payment (`uf.payment`)
* `name`: Char (auto-sequence `PAY0001`)
* `payment_type`: Selection `[('inbound', 'Receive Money / Customer'), ('outbound', 'Send Money / Vendor')]`
* `contact_id`: Many2one (`uf.contact`)
* `invoice_id`: Many2one (`uf.invoice`, optional)
* `bill_id`: Many2one (`uf.bill`, optional)
* `journal_id`: Many2one (`uf.journal`, domain: `[('type', 'in', ['bank', 'cash'])]`)
* `payment_method`: Selection `[('cash', 'Cash'), ('bank', 'Bank Transfer')]`
* `amount`: Float
* `payment_date`: Date (default today)
* `journal_entry_id`: Many2one (`uf.journal.entry`)

---

### 1.10 Journal Entry (`uf.journal.entry`) & Lines (`uf.journal.entry.line`)
#### Header:
* `name`: Char (auto-sequence `JE0001`)
* `journal_id`: Many2one (`uf.journal`)
* `entry_date`: Date
* `reference`: Char (e.g. "INV0001 - Nimesh Pathak")
* `state`: Selection `[('draft', 'Draft'), ('posted', 'Posted'), ('cancelled', 'Cancelled')]`
* `line_ids`: One2many (`uf.journal.entry.line`)
* `total_debit`: Float (computed sum of line debits)
* `total_credit`: Float (computed sum of line credits)

#### Line:
* `account_id`: Many2one (`uf.chart.of.accounts`)
* `contact_id`: Many2one (`uf.contact`, optional)
* `name`: Char (description / label)
* `debit`: Float
* `credit`: Float

---

### 1.11 Analytic Account (`uf.analytic.account`) & Budget (`uf.budget`)
#### Analytic Account:
* `name`: Char
* `type`: Selection `[('income', 'Income'), ('expense', 'Expense')]`

#### Budget:
* `name`: Char
* `analytic_account_id`: Many2one (`uf.analytic.account`)
* `period_start`: Date
* `period_end`: Date
* `planned_amount`: Float
* `committed_amount`: Float
* `achieved_amount`: Float (computed/tracked from posted entries)
* `achieved_percent`: Float (computed: `(achieved_amount / committed_amount) * 100` if committed > 0 else 0)
* `amount_to_achieve`: Float (computed: `committed_amount - achieved_amount`)
* `responsible_id`: Many2one (`res.users`)
* `state`: Selection `[('draft', 'Draft'), ('confirmed', 'Confirmed'), ('revised', 'Revised'), ('cancelled', 'Cancelled')]`

---

## 2. Button Action Methods Contract

Member 2's XML view buttons call these exact method names on Member 1's models:

| Model | Button String in UI | Method Name | Expected Result |
|---|---|---|---|
| `uf.sales.order` | "Confirm" | `action_confirm()` | Changes state to `confirmed` |
| `uf.sales.order` | "Create Invoice" | `action_create_invoice()` | Creates `uf.invoice`, sets SO state to `invoiced`, returns invoice view action |
| `uf.invoice` | "Confirm" | `action_confirm()` | Validates invoice, creates credit sale Journal Entry (`posted`) |
| `uf.invoice` | "Register Payment" | `action_register_payment()` | Opens payment wizard or registers payment record |
| `uf.purchase.order` | "Confirm" | `action_confirm()` | Changes state to `confirmed` |
| `uf.purchase.order` | "Create Bill" | `action_create_bill()` | Creates `uf.bill`, sets PO state to `billed`, returns bill view action |
| `uf.bill` | "Confirm" | `action_confirm()` | Validates bill, creates purchase expense Journal Entry (`posted`) |
| `uf.bill` | "Register Payment" | `action_register_payment()` | Opens payment wizard or registers payment record |
| `uf.payment` | "Post Payment" | `action_post()` | Updates Invoice/Bill `amount_paid` and `state`, creates Cash/Bank Journal Entry |
| `uf.journal.entry` | "Post" | `action_post()` | Validates `total_debit == total_credit`, sets state to `posted` |
| `uf.journal.entry` | "Reset to Draft" | `action_reset_draft()` | Sets state back to `draft` |
| `uf.journal.entry` | "Cancel" | `action_cancel()` | Sets state to `cancelled` |
| `uf.budget` | "Confirm" | `action_confirm()` | Sets state to `confirmed` |
| `uf.budget` | "Revise" | `action_revise()` | Sets state to `revised` |

---

## 3. Double-Entry Accounting Rule Mapping

```
1. Customer Invoice Confirmation:
   Debit:  Debtors Account (Asset)
   Credit: Sales Income Account (Income)

2. Customer Invoice Payment Received:
   Debit:  Cash or Bank Account (Asset)
   Credit: Debtors Account (Asset)

3. Vendor Bill Confirmation:
   Debit:  Purchase Expense Account (Expense)
   Credit: Creditors Account (Liability)

4. Vendor Bill Payment Made:
   Debit:  Creditors Account (Liability)
   Credit: Bank or Cash Account (Asset)
```
**Constraint:** In every posted entry, `sum(debit) == sum(credit)`. If unbalanced, raise `ValidationError`.
