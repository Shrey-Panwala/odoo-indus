# Odoo-Indus Inventory Platform

Modern, hackathon-focused inventory management platform with strong frontend UX, validated stock workflows, and API-first operations.

## 1. Overview

This project delivers an end-to-end inventory experience with:

- Authentication and profile management
- Stock management with validation and live editable controls
- Operations workflows for Receipts, Delivery Orders, and Stock Adjustments
- Move History timeline with list/kanban views
- Settings for Warehouse and Location mapping with strict short-code rules
- API-first services with local fallback stores for demo resilience

The app is designed to remain fully demonstrable even when backend endpoints are unavailable.

## 2. Core Features

### 2.1 Authentication

- Login and signup
- Forgot password with OTP flow
- Optional EmailJS OTP delivery
- Password update from profile panel with strength checks

### 2.2 Dashboard

- KPI cards (stock, low stock, pending operations)
- Stock overview chart
- Operations quick-access cards
- Recent activity feed

### 2.3 Stock Module

- Editable table for:
	- Unit cost
	- On-hand quantity
	- Reserved quantity
	- Increment/decrement adjustments
- Inline validation:
	- No negative values
	- Reserved <= on hand
	- Adjustment cannot make stock negative
- Row-level feedback and safer save/apply actions

### 2.4 Operations Module

- Receipts:
	- List and Kanban view
	- Create/Edit detail workspace
	- Status flow (Draft -> Ready -> Done)
	- Validation action to post stock movement
- Delivery Orders:
	- List and Kanban view
	- Create/Edit detail workspace
	- Status flow (Draft -> Waiting -> Ready -> Done)
	- Out-of-stock prevention before validation
- Stock Adjustments:
	- List, create, detail, validate
	- Ledger-ready movement semantics

### 2.5 Move History

- Dedicated tab with:
	- Default list view
	- Search by reference/contact
	- List/kanban switch
	- Inbound/outbound quantity direction cues
	- Row expansion behavior for multi-line references

### 2.6 Settings

- Warehouse management
- Location management
- Strict validation:
	- Warehouse short code required
	- Location must map to selected warehouse
	- Warehouse short code mismatch is blocked on add/edit

## 3. Architecture

### 3.1 Frontend

- React 18 + Vite
- TypeScript at app shell and route level
- Tailwind CSS + custom utility design system
- Framer Motion for motion/transitions
- React Router for protected app navigation

### 3.2 Backend

- Express API
- SQLite demo database for local development
- PostgreSQL-ready operations route scaffold

### 3.3 Data Strategy

- API-first services
- Automatic fallback to localStorage stores for demo continuity
- Enables hackathon demo even without full DB availability

## 4. API Summary

Base URL: http://localhost:4000

### 4.1 Core APIs

- /api/dashboard/stats
- /api/products
- /api/receipts
- /api/deliveries
- /api/adjustments

### 4.2 Operations APIs

- /api/operations/master/suppliers
- /api/operations/master/warehouses
- /api/operations/master/products
- /api/operations/master/locations
- /api/operations/ledger
- /api/operations/receipts
- /api/operations/deliveries
- /api/operations/adjustments

## 5. Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router
- Axios
- Express
- SQLite3
- PostgreSQL client (pg)

## 6. Project Structure

```text
backend/
	server.cjs
	database.cjs
	routes/

src/
	auth/
	components/
	layout/
	modules/
		dashboard/
		operations/
	pages/
```

## 7. Getting Started

### 7.1 Install

```bash
npm install
```

### 7.2 Run Development

```bash
npm run dev
```

This starts:

- Frontend (Vite): http://localhost:5173
- API (Express): http://localhost:4000

### 7.3 Production Build

```bash
npm run build
```

### 7.4 Preview Build

```bash
npm run preview
```

## 8. Scripts

- npm run dev: run API + frontend concurrently
- npm run dev:web: run frontend only
- npm run dev:api: run API only
- npm run build: typecheck + production build
- npm run lint: lint project
- npm run preview: preview production build

## 9. Environment Variables

Optional EmailJS configuration for OTP mail delivery:

```bash
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

If these are not set, forgot-password uses demo OTP fallback mode.

## 10. Validation and Quality Rules

Implemented validation behavior includes:

- Stock values cannot be negative
- Reserved quantity cannot exceed on hand
- Delivery line quantity cannot exceed available stock
- Duplicate products are blocked within the same operation document
- Required fields enforced for receipts/deliveries/adjustments/settings
- Warehouse-location short code consistency is enforced

## 11. Hackathon Notes

- UI optimized for high-clarity demo flow
- Navigation designed for rapid module switching during judging
- Fallback data strategy prevents demo failure when backend availability is partial
- Operations workflows mirror practical inventory lifecycle stages

## 12. License

This project is prepared for hackathon demonstration and team collaboration.