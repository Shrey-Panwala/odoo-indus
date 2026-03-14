# Odoo-Indus CoreInventory

Modular Inventory Management System (IMS) for hackathon/demo use with real operational flows, PostgreSQL-backed APIs, interactive analytics dashboards, and modern UI.

## What This Project Solves

This app digitizes inventory workflows that are usually tracked in registers and spreadsheets:

- product catalog and stock visibility
- receipts, deliveries, transfers, and adjustments
- real-time stock impact on validation
- stock ledger for traceability
- OTP-based password reset

## Architecture

- Frontend: React + Vite + TypeScript + Tailwind + Framer Motion + Recharts
- Backend: Node.js + Express + PostgreSQL (pg)
- Auth: JWT + bcrypt
- API style: REST under /api/*

## Project Structure

```text
projects/odoo-indus-main/
  backend/
    src/
      db/
      middleware/
      routes/
    .env.example
    package.json
  frontend/
    src/
      auth/
      components/
      layout/
      modules/
      pages/
      services/
    package.json
```

## Core Features

- Authentication
- Signup and login
- Forgot password with OTP verification
- EmailJS integration for OTP email delivery

- Dashboard
- KPI cards for stock and operations
- Interactive graphs with filters (document type, warehouse, category, movement type, date window)
- AI-style inventory insights panel
- Recent activity feed from stock ledger

- Inventory Modules
- Products with stock visibility
- Receipts (incoming stock)
- Deliveries (outgoing stock)
- Internal transfers (location-to-location)
- Stock adjustments (system vs physical count)
- Move history and ledger tracking

- Settings
- Warehouse and location setup

## API Endpoints (Main)

- /api/auth/*
- /api/dashboard/*
- /api/products
- /api/receipts
- /api/deliveries
- /api/transfers
- /api/adjustments
- /api/ledger
- /api/warehouses
- /api/locations

## Local Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 2. Backend Setup

```bash
cd backend
npm install
copy .env.example .env
```

Update backend .env values:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/coreinventory
JWT_SECRET=your_strong_secret
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

Run migrations and seed:

```bash
npm run migrate
npm run seed
```

Start backend:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create frontend .env:

```bash
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

Start frontend:

```bash
npm run dev
```

## Run URLs

- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/api/health

## Build Commands

Backend:

```bash
cd backend
npm start
```

Frontend production build:

```bash
cd frontend
npm run build
```

Frontend preview:

```bash
npm run preview
```

## OTP Email Notes (EmailJS)

Forgot password flow works as:

1. backend generates OTP and stores expiry
2. frontend sends OTP email via EmailJS
3. user verifies OTP
4. password reset is allowed only after OTP verification

Required EmailJS template params:

- to_email
- otp_code
- app_name

If EmailJS env keys are missing, app falls back to demo mode.

## Judge Demo Flow

Recommended path:

1. Login
2. Dashboard KPIs and filters
3. Receipts -> validate -> stock increases
4. Deliveries -> validate -> stock decreases
5. Transfers/adjustments and ledger visibility
6. Forgot password OTP flow

## Troubleshooting

- npm run dev fails from workspace root:
Run commands inside backend or frontend directories.

- Frontend opens on a different port:
If 5173 is occupied, Vite automatically moves to 5174/5175.

- CORS issues:
Ensure backend CORS_ORIGIN matches frontend URL.

- OTP mail not received:
Check frontend .env keys and EmailJS template variable names.

## License

Prepared for hackathon demonstration and team collaboration.