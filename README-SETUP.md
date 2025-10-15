# PMS - Performance Management System Setup

## 🚀 Quick Start Guide

### 1. Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/pms"

# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
```

### 2. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Seed the database with default users
npm run db:seed
```

### 3. Default User Accounts

After seeding, you can login with these accounts:

**Admin Account:**
- Email: `admin@pms.com`
- Password: `password123`
- Role: Admin

**Personnel Accounts:**
- Email: `john.doe@pms.com`
- Email: `jane.smith@pms.com`
- Email: `mike.johnson@pms.com`
- Password: `password123` (for all personnel)
- Role: Personnel

### 4. Run the Application

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the login page.

### 5. Role-Based Access

- **Admin Dashboard:** `/admin/dashboard`
- **Personnel Dashboard:** `/personnel/dashboard`
- **Automatic Redirect:** Users are redirected to their appropriate dashboard after login

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed database with default data
- `npm run db:studio` - Open Prisma Studio
- `npm run build` - Build for production
- `npm run start` - Start production server

## 🔐 Authentication Features

- ✅ JWT-based authentication with NextAuth.js
- ✅ Role-based access control (RBAC)
- ✅ Password hashing with bcryptjs
- ✅ Protected routes with middleware
- ✅ Form validation with Zod
- ✅ Toast notifications
- ✅ Responsive login interface

## 📋 Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Authentication:** NextAuth.js v4
- **Database:** MySQL with Prisma ORM
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Forms:** React Hook Form + Zod validation
- **Notifications:** React Hot Toast
- **Icons:** Lucide React

## 🔄 Persistence Markers

```
#legendary-dev #SRPL #MCP-enabled #CognitivePrompt
System ID: LegendarySystem_v2.1.0
```

