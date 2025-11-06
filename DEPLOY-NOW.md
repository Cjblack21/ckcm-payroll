# 🚀 DEPLOY TO payrollmanagement.space

## Step 1: Push to Git (Run on your local machine)
```bash
git push origin main
```

## Step 2: SSH and Deploy (Run these commands)
```bash
ssh root@72.60.233.210
# Password: Bagsikever16-21

cd /var/www/pms
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart pms

# Check if it's running
pm2 status
pm2 logs pms --lines 50
```

## Step 3: Verify Deployment
Visit: https://payrollmanagement.space

Test:
1. ✅ Login works
2. ✅ Personnel payroll shows 5 cards (Monthly Basic, Period, Overload, Deductions, Net Pay)
3. ✅ Personnel payroll has Current/Archived tabs
4. ✅ View Payslip shows correct overload (₱8,000)
5. ✅ Admin reports generates successfully

## If PM2 is not installed, use systemctl:
```bash
systemctl restart pms
systemctl status pms
```

## Troubleshooting:
If build fails on server:
```bash
# Clear build cache
rm -rf .next
npm run build
pm2 restart pms
```

If database issues:
```bash
npx prisma db push
npx prisma generate
```
