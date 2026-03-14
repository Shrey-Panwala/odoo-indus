# Indus Inventory Management System

Indus is the final integrated inventory management project for this workspace. It combines the authentication flow and inventory dashboard into a single app under one package and one local development command.

## Included modules

- Auth flows: login, signup, forgot password, OTP reset
- Inventory dashboard: KPIs, stock overview, operations, products, activity feed
- Local inventory API: Express + SQLite demo data served from the same project

## Tech stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router
- Express
- SQLite

## Run locally

```bash
npm install
npm run dev
```

The `dev` script starts:

- the Vite frontend
- the inventory API on `http://localhost:4000`

## Build

```bash
npm run build
```

## OTP Email Setup

The forgot-password flow supports EmailJS delivery and falls back to demo OTP mode when the required environment variables are not configured.

```bash
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```