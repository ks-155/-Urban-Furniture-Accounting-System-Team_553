# Urban Furniture — Tech Stack & Judge Q&A Guide

> **Cheat Sheet for Presentation & Judges**
> Use this document to understand the technology choices, how they are applied, and to confidently answer questions from judges in simple, clear words.

---

## 1. Tech Stack Overview

| Layer | Technology | Purpose in Project |
|---|---|---|
| **Frontend** | **Odoo Web Client, OWL (Odoo Web Library), XML & CSS** | Provides interactive Form views, List views, Kanban cards, and the Executive Dashboard. |
| **Backend** | **Python 3 & Odoo Framework (ORM)** | Powers business workflows (Sales, Purchases, Invoicing, Payments), double-entry debit/credit engine, and security access. |
| **Database** | **PostgreSQL** | High-performance, ACID-compliant relational database storing transactions, ledgers, and master data with zero data corruption. |
| **Reporting** | **QWeb Engine / Python Calculation Engine** | Dynamically calculates and renders real-time Balance Sheet, Profit & Loss (P&L), and Budget reports. |

---

## 2. How We Use Each Technology in This Project

### 1. Frontend (XML Views & OWL)
* **What it does:** Renders screens for Contacts, Products, Orders, Bills, and Invoices.
* **How we use it:**
  * **Default List View:** Displays overview tables with statuses (Draft, Confirmed, Paid).
  * **Form View:** Clean data entry forms with action buttons (`Confirm`, `Create Invoice`, `Register Payment`).
  * **Dashboard Cards:** Visual status metrics (`Sales`, `Purchases`, `Budget Utilization`).
  * **Role-based visibility:** Automatically hides admin buttons from portal users.

### 2. Backend (Python & Odoo ORM)
* **What it does:** The "brain" of the application.
* **How we use it:**
  * **Automated Accounting Entries:** When an invoice is paid, Python automatically creates matching Debit and Credit journal lines.
  * **Sequence Generators:** Automatically assigns clean reference numbers (e.g., `SO0001`, `PO0001`, `INV0001`).
  * **Validation Constraints:** Ensures Debits ALWAYS equal Credits before any financial record is posted.

### 3. Database (PostgreSQL)
* **What it does:** Relational data storage with ACID guarantees.
* **How we use it:**
  * Stores relational links: `Customer` ➔ `Sales Order` ➔ `Invoice` ➔ `Payment` ➔ `Journal Entry`.
  * Guarantees that financial transactions are atomic (all-or-nothing), ensuring ledgers never go out of balance.

---

## 3. The 30-Second Elevator Pitch for Judges

> *"Urban Furniture is an end-to-end accounting system built with **Python, Odoo ORM, and PostgreSQL**. 
> Instead of isolated screens, it connects real business workflows: Master Data feeds directly into Purchases and Sales, which automatically generate Bills and Invoices. 
> When payments are recorded, our backend creates **balanced double-entry journal entries in real time**, automatically updating the **Balance Sheet, Profit & Loss, and Budget reports**."*

---

## 4. Cheat Sheet: Questions Judges Will Ask & How to Answer

### Q1: What makes your accounting system different from a normal CRUD website?
* **Simple Answer:**
  > *"A CRUD app just saves data in tables. Our system enforces **real double-entry accounting logic**. Every sale, purchase, and payment triggers automated Debit and Credit journal entries, maintaining exact financial balance and generating live Balance Sheet and P&L statements."*

---

### Q2: Why did you choose Python and Odoo instead of MERN (React/Node)?
* **Simple Answer:**
  > *"Accounting systems require strong data integrity, complex relational structures, and strict security rules. **Odoo and Python** are the industry standard for ERPs and accounting. They provide a robust ORM, built-in financial models, and reliable transactional integrity, allowing us to focus on solving business logic rather than reinventing the wheel."*

---

### Q3: Why PostgreSQL for the database?
* **Simple Answer:**
  > *"Accounting data cannot afford dirty reads or incomplete writes. PostgreSQL provides **strict ACID compliance**, foreign key constraints, and relational transaction safety. If a payment entry fails halfway, the entire transaction rolls back cleanly."*

---

### Q4: How does your double-entry accounting rule work in code?
* **Simple Answer:**
  > *"We follow the standard accounting equation. For example:
  > * When a customer pays cash: **Debit Cash Account, Credit Debtors Account**.
  > * When paying a vendor via bank: **Debit Creditors Account, Credit Bank Account**.
  > Our model checks that `Total Debits == Total Credits` before any entry can be posted. If they don't match, the system rejects it."*

---

### Q5: How do user roles work?
* **Simple Answer:**
  > *"We implemented 3 distinct roles using role-based access control:
  > 1. **Admin:** Full access to configure master data, record any transaction, and view all financial reports.
  > 2. **Accountant:** Can manage master data, execute sales/purchases/invoices, and view reports.
  > 3. **Portal User (Customer/Vendor):** Restricted access; they can only log in to see their own invoices/bills and register payments."*

---

### Q6: How is the Budget system connected to accounting?
* **Simple Answer:**
  > *"Budgets are tied to **Analytic Accounts**. When expenses or sales occur, they are tracked against that account. The system calculates **Achieved % = (Achieved Amount / Committed Amount) * 100**, giving business owners real-time visibility into planned vs. actual spending."*

---

### Q7: How did your 2-member team split the work?
* **Simple Answer:**
  > *"We used a **contract-first, vertical-slice approach**:
  > * **Member 1 (Backend):** Built the database schema, business logic, accounting validation engine, and calculation formulas.
  > * **Member 2 (UI):** Built the views, forms, navigation, dashboard, and integrated them against the pre-agreed API contract.
  > We integrated feature-by-feature rather than merging everything at the end."*
