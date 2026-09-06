# Urban Furniture Accounting System

Urban Furniture is a web-based accounting system for managing contacts,
products, purchases, sales, payments, journals, budgets, and financial reports.

## What the system does

- Manage customers, vendors, products, accounts, journals, and analytic accounts.
- Create purchase orders, vendor bills, and outgoing payments.
- Create sales orders, customer invoices, and incoming payments.
- Generate balanced debit and credit journal entries.
- View the dashboard, profit and loss, balance sheet, and budget reports.
- Support staff accounts and customer portal access.

## How a transaction moves through the system

```text
Master data
    ↓
Purchase Order → Vendor Bill → Payment
Sales Order    → Customer Invoice → Payment
    ↓
Journal Entries (Debit = Credit)
    ↓
Dashboard, P&L, Balance Sheet, and Budget Reports
```

## Technology

- **Frontend:** React, Vite, Tailwind CSS, Axios
- **Backend:** Node.js, Express, JWT, bcrypt
- **Database:** PostgreSQL with Prisma ORM
- **API style:** REST with JSON

## Project structure

```text
backend/
  prisma/       Database schema, migrations, and seed data
  src/routes/   API route definitions
  src/controllers/
                Request validation and accounting workflows
  src/middlewares/
                Authentication and role checks

frontend/
  src/pages/    Application screens
  src/components/
                Shared UI components
  src/services/ Central API client and API methods
  src/context/  Shared frontend accounting state
```

## Running locally

### 1. Start PostgreSQL

Create a PostgreSQL database and configure `backend/.env` using
[`backend/.env.example`](backend/.env.example).

### 2. Start the backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The API runs at `http://localhost:5000`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The web application runs at `http://localhost:5173`.

Set `VITE_API_URL` in `frontend/.env` if the API is running somewhere other
than `http://localhost:5000/api`. Set `VITE_USE_MOCK=false` when you want the
frontend to use the backend only and not fall back to demo data.

## Useful commands

| Location | Command | Purpose |
| --- | --- | --- |
| `backend/` | `npm run dev` | Start the API with reload |
| `backend/` | `npm test` | Run backend integration tests |
| `backend/` | `npm run prisma:seed` | Load demo accounts and users |
| `frontend/` | `npm run dev` | Start the Vite development server |
| `frontend/` | `npm run build` | Create a production build |
| `frontend/` | `npm run lint` | Run frontend lint checks |

## System flow diagrams

### 1. System overview

![System overview](docs/diagrams/01-system-overview.svg)

### 2. Login and security

![Login and security](docs/diagrams/02-login-and-security.svg)

### 3. Master data

![Master data](docs/diagrams/03-master-data.svg)

### 4. Business transactions

![Business transactions](docs/diagrams/04-business-transactions.svg)

### 5. Reports and dashboard

![Reports and dashboard](docs/diagrams/05-reports-and-dashboard.svg)

## Documentation

- [Architecture and design](docs/ARCHITECTURE.md)
- [API contract](docs/CONTRACT.md)
- [Implementation plan](docs/implementation_plan.md)
- [Task checklist](docs/task.md)

## Team

- **Vatsalya — Backend:** API, Prisma schema, PostgreSQL integration,
  authentication, accounting rules, and financial calculations.
- **Krish — Frontend:** React screens, navigation, forms, dashboards, reports,
  and frontend-to-API integration.
