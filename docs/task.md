# Urban Furniture — Task Tracker (Node.js + React Stack)

## Phase 0 — Architecture & Contract (Both)
- [x] Select tech stack (React + Tailwind, Node + Express, PostgreSQL + Prisma)
- [x] Finalize database models & relationships in Prisma schema
- [x] Agree on REST API endpoints and JSON payloads (`docs/CONTRACT.md`)
- [x] Create GitHub repository & push initial docs to `main`

## Phase 1 — Foundation & Scaffolding
### Member 1 (Backend)
- [ ] Initialize `backend/` folder (`package.json`)
- [ ] Install dependencies (`express`, `prisma`, `@prisma/client`, `cors`, `dotenv`, `bcryptjs`, `jsonwebtoken`)
- [ ] Configure `prisma/schema.prisma` with all models
- [ ] Set up PostgreSQL connection string in `.env`
- [ ] Create database seed script (`prisma/seed.js`) for CoA, Journals, and Admin user
- [ ] Setup Express server with error handling & CORS (`src/server.js`)

### Member 2 (Frontend)
- [ ] Initialize `frontend/` with Vite + React + Tailwind CSS
- [ ] Setup API client (`src/services/api.js`) pointed to `http://localhost:5000/api`
- [ ] Setup Router & Dashboard skeleton

## Phase 2 — Master Data APIs
### Member 1 (Backend)
- [ ] Contacts controller & routes (`/api/contacts`)
- [ ] Products controller & routes (`/api/products`)
- [ ] Chart of Accounts routes (`/api/accounts`)
- [ ] Journals routes (`/api/journals`)

### Member 2 (Frontend)
- [ ] Contacts List & Form view (with New/Confirm/Back buttons)
- [ ] Products List & Form view
- [ ] CoA List & Journals List views

## Phase 3 — Sales Workflow
### Member 1 (Backend)
- [ ] Create Sales Order API (`POST /api/sales`)
- [ ] Confirm Sales Order API (`POST /api/sales/:id/confirm`)
- [ ] Generate Invoice from SO API (`POST /api/sales/:id/create-invoice`)
- [ ] Confirm Invoice API (`POST /api/invoices/:id/confirm`) + auto double-entry JE
- [ ] Pay Invoice API (`POST /api/invoices/:id/pay`) + auto double-entry JE

### Member 2 (Frontend)
- [ ] Sales Order creation form & list
- [ ] Customer Invoice view & Confirm button
- [ ] Register Payment modal

## Phase 4 — Purchase Workflow
### Member 1 (Backend)
- [ ] Create Purchase Order API (`POST /api/purchases`)
- [ ] Confirm Purchase Order API (`POST /api/purchases/:id/confirm`)
- [ ] Generate Vendor Bill API (`POST /api/purchases/:id/create-bill`)
- [ ] Confirm Bill API (`POST /api/bills/:id/confirm`) + auto double-entry JE
- [ ] Pay Bill API (`POST /api/bills/:id/pay`) + auto double-entry JE

### Member 2 (Frontend)
- [ ] Purchase Order creation form & list
- [ ] Vendor Bill view & Confirm button
- [ ] Register Payment modal

## Phase 5 — Budget System
### Member 1 (Backend)
- [ ] Create Budget API (`POST /api/budgets`)
- [ ] List Budgets with live calculation of `achievedPercent` & `amountToAchieve`
- [ ] Confirm / Revise status endpoints

### Member 2 (Frontend)
- [ ] Budget Kanban view (Achieved / Budget / Committed cards)
- [ ] Budget creation form

## Phase 6 — Accounting Engine
### Member 1 (Backend)
- [ ] Journal Entries list & detail API (`/api/journal-entries`)
- [ ] Manual Journal Entry posting with strict `totalDebit === totalCredit` check

### Member 2 (Frontend)
- [ ] Journal Entries table view with Debit/Credit line display
- [ ] Balance status warning if lines are unbalanced

## Phase 7 — Financial Reports
### Member 1 (Backend)
- [ ] Balance Sheet API (`GET /api/reports/balance-sheet`)
- [ ] Profit & Loss API (`GET /api/reports/profit-loss`)
- [ ] Budget Report API (`GET /api/reports/budget`)

### Member 2 (Frontend)
- [ ] Balance Sheet screen
- [ ] Profit & Loss screen
- [ ] Budget Report screen

## Phase 8 — Authentication & Roles
### Member 1 (Backend)
- [ ] Login endpoint (`POST /api/auth/login`) with credential validation
- [ ] Signup endpoint (`POST /api/auth/signup`) creating USER role
- [ ] Auth & Role verification middleware (ADMIN, ACCOUNTANT, USER)

### Member 2 (Frontend)
- [ ] Login screen matching mockup
- [ ] Sign-up screen matching mockup
- [ ] Role-based view filtering (USER sees only their own invoices)

## Phase 9 — Interactive Dashboard
### Member 1 (Backend)
- [ ] Aggregated dashboard stats API (`GET /api/dashboard`)

### Member 2 (Frontend)
- [ ] App Dashboard UI matching mockup cards & top navigation

## Phase 10 — End-to-End Integration & Demo
- [ ] Full end-to-end user story test
- [ ] Demo script preparation & practice
