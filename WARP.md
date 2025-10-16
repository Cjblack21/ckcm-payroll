# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository overview
- Stack: Next.js 15 (App Router), React 19, TypeScript, Prisma (MySQL), NextAuth, Tailwind v4, shadcn/ui
- App root: src/

Common commands
- Install deps: npm install
- Dev server: npm run dev
- Build: npm run build
- Start (prod): npm start
- Lint: npm run lint
- Prisma client: npm run db:generate
- Push schema (dev): npm run db:push
- Migrate (interactive, dev): npm run db:migrate
- Seed database: npm run db:seed
- Prisma Studio: npm run db:studio
- Utility: node scripts/cleanup-yesterday-attendance.js
- Tests: no test suite configured in package.json

Environment
- Required: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
- Optional: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (for Google OAuth), NEXT_PUBLIC_BASE_PATH (to host under a sub-path)
- Production template: .env.production.example

Database and seeding
- ORM: Prisma; schema at prisma/schema.prisma
- Seed script creates an ADMIN (admin@pms.com / password123) and 3 PERSONNEL users; run npm run db:seed

High-level architecture
- Runtime and routing (Next.js App Router)
  - Pages under src/app with role-scoped areas:
    - /admin/*: admin dashboards and management UIs
    - /personnel/*: personnel dashboards and self-service
    - /api/*: route handlers grouped by domain (attendance, payroll, users, reports, etc.)
  - Global layout and styles in src/app/layout.tsx and src/app/globals.css
- Authentication and access control
  - NextAuth configured in src/lib/auth.ts with credentials and Google providers
  - Google OAuth restricted to @ckcm.edu.ph; new Google users go through an account setup flow (/account-setup)
  - JWT sessions; role added to token/session
  - Middleware src/middleware.ts enforces:
    - Public access for auth endpoints, static assets, attendance APIs, and account-setup
    - Role-gated routing (/admin for ADMIN, /personnel for PERSONNEL/ADMIN)
    - Redirects generic /dashboard to role-specific dashboards
- Data models and persistence
  - MySQL via Prisma with core models: User, Session, Attendance, PayrollEntry, Loan, DeductionType, Deduction, PersonnelType, AttendanceSettings, HeaderSettings, PayrollSchedule, LeaveRequest (+ enums for statuses/types)
  - Prisma client singleton at src/lib/prisma.ts
- Business logic and server actions
  - Server actions under src/lib/actions/* for auth, attendance, payroll, personnel
  - Attendance/payroll calculations in src/lib/attendance-calculations*.ts
  - Payslip generation: src/lib/payslip-generator.ts and src/lib/pdf-payslip-generator.tsx (React PDF)
- API surface (App Router route handlers)
  - Admin domain: src/app/api/admin/* (attendance, payroll generation/release/printing, users, types, reports, settings)
  - Personnel domain: src/app/api/personnel/* (dashboard, attendance, loans, payroll)
  - Shared: auth at src/app/api/auth/[...nextauth]/route.ts, notifications, dashboard data, etc.
- UI system
  - Reusable components in src/components and shadcn/ui primitives in src/components/ui
  - Sidebars, headers, charts (Recharts), calendar, forms (react-hook-form + zod)
- Config and tooling
  - TypeScript paths: @/* -> src/* (see tsconfig.json)
  - ESLint flat config (eslint.config.mjs) with next/core-web-vitals + typescript
  - next.config.ts: optional basePath via NEXT_PUBLIC_BASE_PATH, remote image patterns, dev image unoptimized, optimizePackageImports
- Deployment artifacts
  - Shell scripts under deploy/ for VPS provisioning, DB setup, app deploy, Nginx/SSL

Key references
- README.md: features, tech stack, setup steps, project structure, deployment basics
- README-SETUP.md: quick start, env vars, seed accounts, available scripts
- MYSQL-SETUP-INSTRUCTIONS.md: local MySQL/XAMPP setup and troubleshooting
- GOOGLE-OAUTH-SETUP.md and GOOGLE-OAUTH-TROUBLESHOOTING.md: provider config, flow, and common issues
- .env.production.example: production env template
