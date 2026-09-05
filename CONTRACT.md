# Urban Furniture — API Contract (CONTRACT.md)

> **Contract between Member 1 (Node.js/Express Backend) and Member 2 (React.js Frontend)**
> Base URL: `http://localhost:5000/api`

---

## 1. Authentication (`/api/auth`)

### 1.1 Sign In
* **POST** `/auth/login`
* **Request:**
```json
{
  "loginId": "accountant01",
  "password": "Password@123"
}
```
* **Response (200 OK):**
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": 1,
    "name": "Alex Accountant",
    "loginId": "accountant01",
    "email": "alex@urbanfurniture.com",
    "role": "ACCOUNTANT",
    "contactId": null
  }
}
```
* **Error (401 Unauthorized):**
```json
{ "error": "Invalid Login Id or Password" }
```

### 1.2 Sign Up (Portal User Only)
* **POST** `/auth/signup`
* **Request:**
```json
{
  "name": "Nimesh Pathak",
  "loginId": "nimeshp",
  "email": "nimesh@gmail.com",
  "password": "Password@123",
  "confirmPassword": "Password@123"
}
```
* **Validation Rules:**
  - `loginId`: 6 to 12 characters, unique.
  - `email`: valid email, unique.
  - `password`: 8+ characters, must include lowercase, uppercase, and special character.
* **Response (201 Created):**
```json
{
  "message": "User created successfully",
  "user": { "id": 2, "loginId": "nimeshp", "role": "USER" }
}
```

---

## 2. Master Data APIs

### 2.1 Contacts (`/api/contacts`)
* **GET** `/contacts` — list contacts (Query params: `?type=CUSTOMER` or `?type=VENDOR`)
* **GET** `/contacts/:id` — get single contact details
* **POST** `/contacts` — create contact:
```json
{
  "name": "Azure Furniture",
  "type": "VENDOR",
  "email": "azure@furniture.com",
  "mobile": "9876543210",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "image": "base64_string_or_url"
}
```
* **PUT** `/contacts/:id` — update contact

### 2.2 Products (`/api/products`)
* **GET** `/products` — list all products
* **POST** `/products` — create product:
```json
{
  "name": "Office Chair",
  "type": "GOODS",
  "salesPrice": 2000.0,
  "costPrice": 1500.0,
  "category": "Office Furniture"
}
```

### 2.3 Chart of Accounts (`/api/accounts`)
* **GET** `/accounts` — list all accounts (Cash, Bank, Debtors, Creditors, Sales Income, Purchase Expense)
* **POST** `/accounts` — create account:
```json
{
  "code": "1001",
  "name": "Cash",
  "accountType": "ASSET"
}
```

### 2.4 Journals (`/api/journals`)
* **GET** `/journals` — list all journals (Sales, Purchase, Bank, Cash)
* **POST** `/journals` — create journal

---

## 3. Purchase Workflow (`/api/purchases`)

### 3.1 Create Purchase Order
* **POST** `/purchases`
```json
{
  "vendorId": 1,
  "lines": [
    {
      "productId": 2,
      "quantity": 10,
      "unitPrice": 1500.0
    }
  ]
}
```
* **Response (201 Created):**
```json
{
  "id": 1,
  "orderNumber": "PO0001",
  "vendorId": 1,
  "status": "DRAFT",
  "totalAmount": 15000.0,
  "lines": [...]
}
```

### 3.2 Confirm Purchase Order
* **POST** `/purchases/:id/confirm`
* **Response:** `{ "id": 1, "status": "CONFIRMED" }`

### 3.3 Create Vendor Bill from PO
* **POST** `/purchases/:id/create-bill`
* **Response (201 Created):**
```json
{
  "id": 1,
  "billNumber": "BILL0001",
  "purchaseOrderId": 1,
  "vendorId": 1,
  "status": "DRAFT",
  "totalAmount": 15000.0,
  "amountPaid": 0.0,
  "amountDue": 15000.0
}
```

### 3.4 Confirm Vendor Bill
* **POST** `/bills/:id/confirm`
* **Action:** Confirms Bill and **auto-creates double-entry Journal Entry**:
  - Debit: `Purchase Expense` (₹15,000)
  - Credit: `Creditors` (₹15,000)
* **Response:** `{ "id": 1, "status": "CONFIRMED", "journalEntryId": 5 }`

### 3.5 Register Payment for Bill
* **POST** `/bills/:id/pay`
```json
{
  "journalId": 3,
  "paymentMethod": "BANK",
  "amount": 15000.0
}
```
* **Action:** Marks Bill as `PAID` and creates Journal Entry:
  - Debit: `Creditors` (₹15,000)
  - Credit: `Bank` (₹15,000)
* **Response:** `{ "message": "Payment recorded", "billStatus": "PAID" }`

---

## 4. Sales Workflow (`/api/sales`)

### 4.1 Create Sales Order
* **POST** `/sales`
```json
{
  "customerId": 2,
  "lines": [
    {
      "productId": 1,
      "quantity": 5,
      "unitPrice": 2000.0,
      "taxPercent": 18.0
    }
  ]
}
```
* **Response (201 Created):**
```json
{
  "id": 1,
  "orderNumber": "SO0001",
  "customerId": 2,
  "status": "DRAFT",
  "totalAmount": 11800.0
}
```

### 4.2 Confirm Sales Order
* **POST** `/sales/:id/confirm`

### 4.3 Create Customer Invoice from SO
* **POST** `/sales/:id/create-invoice`
* **Response (201 Created):**
```json
{
  "id": 1,
  "invoiceNumber": "INV0001",
  "customerId": 2,
  "salesOrderId": 1,
  "status": "DRAFT",
  "totalAmount": 11800.0,
  "amountDue": 11800.0
}
```

### 4.4 Confirm Customer Invoice
* **POST** `/invoices/:id/confirm`
* **Action:** Confirms Invoice and creates Journal Entry:
  - Debit: `Debtors` (₹11,800)
  - Credit: `Sales Income` (₹11,800)

### 4.5 Register Payment for Invoice
* **POST** `/invoices/:id/pay`
```json
{
  "journalId": 4,
  "paymentMethod": "CASH",
  "amount": 11800.0
}
```
* **Action:** Marks Invoice as `PAID` and creates Journal Entry:
  - Debit: `Cash` (₹11,800)
  - Credit: `Debtors` (₹11,800)

---

## 5. Accounting Engine (`/api/journal-entries`)

### 5.1 List Journal Entries
* **GET** `/journal-entries`
* Returns all entries with status, total debits, total credits, and line items.

### 5.2 Manual Journal Entry Creation
* **POST** `/journal-entries`
```json
{
  "journalId": 1,
  "entryDate": "2026-09-05",
  "reference": "Adjustment",
  "lines": [
    { "accountId": 1, "label": "Cash in Hand", "debit": 5000, "credit": 0 },
    { "accountId": 5, "label": "Sales Income", "debit": 0, "credit": 5000 }
  ]
}
```
* **Validation:** Backend strictly validates that `totalDebit === totalCredit`. If not equal, returns `400 Bad Request`:
```json
{ "error": "Journal Entry is unbalanced! Total Debit (5000) != Total Credit (4000)" }
```

---

## 6. Budget & Analytics (`/api/budgets`)

* **GET** `/budgets` — list budgets with computed `achievedPercent` and `amountToAchieve`
* **POST** `/budgets` — create budget:
```json
{
  "name": "Q3 Furniture Production",
  "analyticAccountId": 1,
  "periodStart": "2026-07-01",
  "periodEnd": "2026-09-30",
  "plannedAmount": 100000.0,
  "committedAmount": 80000.0,
  "responsiblePerson": "Nimesh Pathak"
}
```
* **POST** `/budgets/:id/confirm`
* **POST** `/budgets/:id/revise`

---

## 7. Reports (`/api/reports`)

### 7.1 Balance Sheet
* **GET** `/reports/balance-sheet`
```json
{
  "assets": [
    { "account": "Cash", "balance": 11800 },
    { "account": "Bank", "balance": -15000 },
    { "account": "Debtors", "balance": 0 }
  ],
  "totalAssets": -3200,
  "liabilities": [
    { "account": "Creditors", "balance": 0 }
  ],
  "totalLiabilities": 0,
  "equity": 0,
  "isBalanced": true
}
```

### 7.2 Profit & Loss (P&L)
* **GET** `/reports/profit-loss`
```json
{
  "income": [
    { "account": "Sales Income", "amount": 11800 }
  ],
  "totalIncome": 11800,
  "expenses": [
    { "account": "Purchase Expense", "amount": 15000 }
  ],
  "totalExpenses": 15000,
  "netProfit": -3200
}
```

### 7.3 Budget Report
* **GET** `/reports/budget`
```json
[
  {
    "budgetName": "Q3 Furniture Production",
    "analyticAccount": "Production",
    "planned": 100000,
    "committed": 80000,
    "achieved": 15000,
    "achievedPercent": 18.75,
    "amountToAchieve": 65000,
    "status": "CONFIRMED"
  }
]
```

---

## 8. Dashboard Data (`/api/dashboard`)

* **GET** `/dashboard`
* Matches the exact layout cards from the Excalidraw mockup:
```json
{
  "sales": {
    "all": 12,
    "confirmed": 10,
    "draft": 2,
    "totalRevenue": 150000
  },
  "purchase": {
    "all": 12,
    "confirmed": 10,
    "draft": 2,
    "totalExpense": 110000
  },
  "budget": {
    "achieved": 3,
    "budget": 2,
    "committed": 4
  },
  "financials": {
    "netProfit": 40000,
    "totalReceivables": 25000,
    "totalPayables": 18000
  }
}
```
