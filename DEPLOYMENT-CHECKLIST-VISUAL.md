# ✅ DEPLOYMENT CHECKLIST - VISUAL GUIDE

## 🎯 PRE-DEPLOYMENT (Do this FIRST!)

```
┌─────────────────────────────────────────┐
│  ☐ Open Terminal/PowerShell             │
│  ☐ Navigate to project folder           │
│  ☐ Test build: npm run build            │
│  ☐ Build succeeds? → Continue            │
│  ☐ Build fails? → FIX ERRORS FIRST!      │
└─────────────────────────────────────────┘
```

---

## 🚀 DEPLOYMENT OPTIONS

### Option A: Automated (RECOMMENDED) ⭐

```powershell
# Windows PowerShell
cd "D:\pms (test 1)"
powershell -ExecutionPolicy Bypass -File .\deploy-windows.ps1
```

```bash
# Git Bash
cd "D:\pms (test 1)"
bash DEPLOY-ERROR-FREE.sh
```

**What happens:**
```
[1/5] Pre-checks ────────────► ✅
[2/5] Test build ────────────► ✅
[3/5] Push to Git ───────────► ✅
[4/5] Deploy to VPS ─────────► ✅
[5/5] Restart app ───────────► ✅
```

---

### Option B: Manual (If script fails)

```bash
# Step 1: Push code
git add .
git commit -m "Deploy update"
git push origin main

# Step 2: Deploy on VPS
ssh root@72.60.233.210

cd /var/www/pms
git pull origin main
rm -rf .next node_modules/.cache
npm install --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
NODE_ENV=production npm run build
pm2 restart pms
pm2 logs pms --lines 30
```

---

## 📊 DEPLOYMENT FLOW DIAGRAM

```
┌──────────────────┐
│  Local Machine   │
└────────┬─────────┘
         │
         │ 1. Test Build
         ▼
    ┌─────────┐
    │ Success?│──No──► Fix Errors
    └────┬────┘
         │ Yes
         │ 2. Push to Git
         ▼
┌──────────────────┐
│   GitHub Repo    │
└────────┬─────────┘
         │
         │ 3. SSH to VPS
         ▼
┌──────────────────┐
│  VPS Server      │
│  72.60.233.210   │
└────────┬─────────┘
         │
         │ 4. Pull Code
         ▼
    ┌─────────┐
    │  Build  │
    └────┬────┘
         │
         │ 5. Restart
         ▼
┌──────────────────┐
│   Live Site      │
│ payrollmanage-   │
│ ment.space       │
└──────────────────┘
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### Step 1: Check VPS Status
```bash
ssh root@72.60.233.210
pm2 status
```

**Expected Output:**
```
┌─────┬──────┬─────────┬─────────┬─────────┐
│ id  │ name │ status  │ restart │ uptime  │
├─────┼──────┼─────────┼─────────┼─────────┤
│ 0   │ pms  │ online  │ 0       │ 5s      │
└─────┴──────┴─────────┴─────────┴─────────┘
```

✅ Status should be **"online"** (green)

---

### Step 2: Check Logs
```bash
pm2 logs pms --lines 30
```

**Good Signs:**
```
✅ "Ready in Xms"
✅ "Compiled successfully"
✅ No error messages
```

**Bad Signs:**
```
❌ "Error: Cannot find module"
❌ "Database connection failed"
❌ "Port already in use"
```

---

### Step 3: Test Website

Open browser: **https://payrollmanagement.space**

```
┌─────────────────────────────────────┐
│  ☐ Homepage loads                   │
│  ☐ Login page appears               │
│  ☐ Can login successfully           │
│  ☐ Dashboard shows data             │
│  ☐ Payroll features work            │
│  ☐ No errors in browser console     │
└─────────────────────────────────────┘
```

---

## 🔧 TROUBLESHOOTING FLOWCHART

```
         Deployment Failed?
                │
        ┌───────┴───────┐
        │               │
    Build Error?    Git Error?
        │               │
        ▼               ▼
   Fix code in    Check internet
   local first    & credentials
        │               │
        └───────┬───────┘
                │
         Try Again
                │
        ┌───────┴───────┐
        │               │
    Still fails?    Works now?
        │               │
        ▼               ▼
   Check logs      SUCCESS! 🎉
   pm2 logs pms
```

---

## 🆘 QUICK FIX COMMANDS

### App Won't Start
```bash
ssh root@72.60.233.210
cd /var/www/pms
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run build
pm2 restart pms
```

### Database Error
```bash
ssh root@72.60.233.210
cd /var/www/pms
npx prisma generate
npx prisma migrate deploy
pm2 restart pms
```

### Port Already in Use
```bash
ssh root@72.60.233.210
pm2 delete pms
pm2 start npm --name "pms" -- start
pm2 save
```

### Complete Reset (Nuclear Option)
```bash
ssh root@72.60.233.210
cd /var/www/pms
git reset --hard origin/main
rm -rf .next node_modules
npm install --legacy-peer-deps
npx prisma generate
npm run build
pm2 restart pms
```

---

## 📈 SUCCESS INDICATORS

### ✅ Deployment Successful When:

```
┌──────────────────────────────────────┐
│ ✅ Script completes without errors   │
│ ✅ pm2 status shows "online"         │
│ ✅ Website loads in browser          │
│ ✅ Can login and use features        │
│ ✅ No errors in pm2 logs             │
│ ✅ No errors in browser console      │
└──────────────────────────────────────┘
```

---

## 🔄 ROLLBACK PROCEDURE

If deployment breaks everything:

```bash
# Quick rollback
bash rollback.sh

# OR Manual rollback
ssh root@72.60.233.210
cd /var/www/pms
git reset --hard HEAD~1
npm install --legacy-peer-deps
npm run build
pm2 restart pms
```

---

## 📞 SUPPORT RESOURCES

### Files to Check:
- `DEPLOY-NOW-SIMPLE.md` - Quick start guide
- `DEPLOY-GUIDE-FINAL.md` - Detailed guide
- `DEPLOY-ERROR-FREE.sh` - Bash script
- `deploy-windows.ps1` - PowerShell script

### Commands to Remember:
```bash
# Check status
ssh root@72.60.233.210
pm2 status

# View logs
pm2 logs pms

# Restart app
pm2 restart pms

# Monitor live
pm2 monit
```

---

## 🎯 DEPLOYMENT TIMELINE

```
Typical deployment takes: 3-5 minutes

┌─────────────────────────────────────────┐
│ Local build test:     30-60 seconds     │
│ Git push:             5-10 seconds      │
│ VPS pull & install:   60-90 seconds     │
│ VPS build:            60-120 seconds    │
│ Restart:              5-10 seconds      │
└─────────────────────────────────────────┘

Total: ~3-5 minutes for full deployment
```

---

**Last Updated:** 2025-11-11  
**Version:** 1.0 - Visual Edition
