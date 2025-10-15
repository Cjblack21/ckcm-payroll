# MySQL Database Setup Instructions

## 🚨 IMPORTANT: Manual Steps Required

Due to terminal output limitations, please follow these steps manually:

### 1. Ensure XAMPP MySQL is Running
- Start XAMPP Control Panel
- Start MySQL service
- Verify it's running on port 3306

### 2. Create Database
- Open phpMyAdmin (http://localhost/phpmyadmin)
- Create database named: `ckcm_payroll`

### 3. Run Setup Commands
Open Command Prompt/PowerShell in the project directory and run:

```bash
# Step 1: Generate Prisma client
npx prisma generate

# Step 2: Push schema to database
npx prisma db push

# Step 3: Seed database with users
npx prisma db seed

# Step 4: Verify setup
node verify-auth.js
```

### 4. Test Authentication
1. Start the server: `npm run dev`
2. Visit: http://localhost:3001
3. Login with:
   - **Admin:** admin@pms.com / password123
   - **Personnel:** john.doe@pms.com / password123

## ✅ Expected Results

After successful setup:
- ✅ Database "ckcm_payroll" exists
- ✅ Tables "users" and "sessions" created
- ✅ 4 users seeded (1 admin, 3 personnel)
- ✅ Authentication works
- ✅ Role-based redirects work

## 🐛 Troubleshooting

### Error: "Unknown database 'ckcm_payroll'"
- Create the database in phpMyAdmin first

### Error: "Can't reach database server"
- Start XAMPP MySQL service
- Check if MySQL is running on port 3306

### Error: "Access denied"
- Default XAMPP MySQL: user=root, password=(empty)
- Update DATABASE_URL if different

## 📋 Database Configuration

Current settings in `.env`:
```
DATABASE_URL="mysql://root:@localhost:3306/ckcm_payroll"
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="legendary-pms-secret-key-change-in-production-123456789"
```

## 🔄 Reset Database (if needed)
```bash
npx prisma db push --force-reset
npx prisma db seed
```

