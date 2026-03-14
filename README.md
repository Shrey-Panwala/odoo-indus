# Indus Inventory Management System

Indus is a frontend inventory management system interface built with React, TypeScript, Vite, Tailwind CSS, and Framer Motion. The current build focuses on authentication screens that provide a polished entry point for warehouse, stock, and admin users.

## Pages

### Login Page

- Email and password validation
- Show/hide password support
- Loading state on sign in
- Quick navigation to the signup page

### Signup Page

- Full name, email, password, and confirm password inputs
- Password strength indicator
- Password requirement checklist
- Terms agreement flow and redirect back to login after registration

## Website Overview

This website is designed as the starting point for an inventory management system. It is intended to help users securely access modules for product tracking, stock monitoring, order handling, and general inventory operations.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## OTP Email Setup (Forgot Password)

The forgot-password flow now supports real OTP email delivery using EmailJS.

1. Create an EmailJS account and set up:
- One email service
- One email template

2. In your EmailJS template, use these variables:
- `{{to_email}}`
- `{{otp_code}}`
- `{{app_name}}`

3. Create a `.env` file from `.env.example` and fill:

```bash
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

4. Restart the dev server.

If these values are missing, the app automatically falls back to demo OTP mode for local testing.