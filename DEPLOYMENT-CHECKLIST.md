# ✅ Error-Free Deployment Checklist

## 🎯 Goal: Ensure Local = Production (No Errors)

---

## 📋 **PRE-DEPLOYMENT (On Windows PC)**

### 1. Test Locally First
```powershell
cd "D:\pms (test 1)"

# Clean install
rm -rf node_modules, .next
npm install

# Generate Prisma
npx prisma generate

# Build
npm run build
```

**✅ If build succeeds → Safe to deploy**  
**❌ If build fails → Fix errors first!**

---

### 2. Commit Everything
```powershell
# Check what's changed
git status

# Stage ALL files
git add .

# Commit
git commit -m "Your commit message"

# Push to repository
git push origin main
```

**✅ Verify on GitHub/GitLab that all files are pushed**

---

## 🚀 **DEPLOYMENT (On VPS)**

### Option A: Quick Manual Deployment

```bash
ssh root@72.60.233.210

cd /var/www/pms
git pull origin main
npm ci
npx prisma generate
npx prisma db push
npm run build
systemctl restart pms
systemctl status pms
```

---

### Option B: Automated Safe Deployment

**Upload the script first (from Windows):**
```powershell
scp .\deploy\safe-update.sh root@72.60.233.210:/root/
```

**Then on VPS:**
```bash
ssh root@72.60.233.210

# Edit to set your DB password
nano /root/safe-update.sh
# Find: DB_PASS:-your_password_here
# Replace with your actual password

# Make executable
chmod +x /root/safe-update.sh

# Run deployment
bash /root/safe-update.sh
```

---

## 🔍 **POST-DEPLOYMENT VERIFICATION**

### 1. Check Service
```bash
systemctl status pms
```
**Expected:** `Active: active (running)` in green

---

### 2. Check Logs
```bash
journalctl -u pms -n 50
```
**Expected:** No errors, see "Ready" or "compiled successfully"

---

### 3. Test Locally on VPS
```bash
curl http://localhost:3000
```
**Expected:** HTML response (not error)

---

### 4. Test in Browser
Open: `http://72.60.233.210`

**Expected:** Login page loads

---

### 5. Test Login & Features
- Login with your credentials
- Check all pages work
- Test key features

---

## 🛡️ **COMMON ISSUES & FIXES**

### Issue 1: Build Fails on VPS

**Cause:** Different Node.js versions or missing dependencies

**Fix:**
```bash
cd /var/www/pms
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

---

### Issue 2: Service Won't Start

**Check logs:**
```bash
journalctl -u pms -n 100 --no-pager
```

**Common fixes:**
```bash
# Fix 1: Regenerate Prisma
cd /var/www/pms
npx prisma generate
systemctl restart pms

# Fix 2: Check .env exists
cat /var/www/pms/.env

# Fix 3: Rebuild
npm run build
systemctl restart pms
```

---

### Issue 3: Database Schema Mismatch

**Fix:**
```bash
cd /var/www/pms
npx prisma db push --force-reset  # ⚠️ This deletes data!
# OR safer:
npx prisma db push --accept-data-loss
```

---

### Issue 4: Port 3000 Already in Use

**Fix:**
```bash
# Kill the old process
killall node
# OR
systemctl restart pms
```

---

## 📊 **VERSION PARITY CHECK**

### Ensure same versions on Local & VPS:

**Local (Windows):**
```powershell
node --version
npm --version
```

**VPS:**
```bash
node --version
npm --version
```

**Both should be:**
- Node.js: v20.x or higher
- npm: v10.x or higher

---

## 🔐 **IMPORTANT FILES TO SYNC**

These files MUST be in sync:

- ✅ `package.json` - Dependencies
- ✅ `package-lock.json` - Exact versions
- ✅ `prisma/schema.prisma` - Database schema
- ✅ All `src/` files - Application code
- ✅ `next.config.ts` - Next.js config
- ✅ `tsconfig.json` - TypeScript config

These files should NOT be synced:
- ❌ `node_modules/` - Generated
- ❌ `.next/` - Generated
- ❌ `.env` - Environment-specific
- ❌ `prisma/dev.db` - Local database

---

## 🎯 **DEPLOYMENT SUCCESS INDICATORS**

You'll know deployment succeeded when:

1. ✅ Git pull shows "Already up to date" or lists new commits
2. ✅ `npm run build` completes with no errors
3. ✅ `systemctl status pms` shows "active (running)"
4. ✅ `journalctl -u pms` shows no errors
5. ✅ `curl http://localhost:3000` returns HTML
6. ✅ Browser shows your app at `http://72.60.233.210`
7. ✅ You can login and use all features

---

## 💡 **PRO TIPS**

### 1. Always Test Locally First
```powershell
npm run build  # Must succeed before deploying
```

### 2. Use `npm ci` instead of `npm install` on VPS
```bash
npm ci  # Installs exact versions from package-lock.json
```

### 3. Keep Backups
The safe-update.sh script automatically backs up to:
`/root/pms-backups/[timestamp]/`

### 4. Monitor Logs During Deployment
In a separate terminal:
```bash
ssh root@72.60.233.210
journalctl -u pms -f
```

### 5. Quick Rollback
If something goes wrong:
```bash
cd /var/www/pms
git reset --hard HEAD~1  # Go back one commit
npm install
npm run build
systemctl restart pms
```

---

## 📞 **QUICK REFERENCE**

### One-Line Update (if you're confident)
```bash
ssh root@72.60.233.210 "cd /var/www/pms && git pull && npm ci && npx prisma generate && npx prisma db push && npm run build && systemctl restart pms && systemctl status pms"
```

### Check Everything is Synced
```bash
ssh root@72.60.233.210 "cd /var/www/pms && git status && git log -1"
```

---

## ✅ **FINAL CHECKLIST**

Before deploying:
- [ ] Local build succeeds (`npm run build`)
- [ ] All changes committed (`git status` is clean)
- [ ] Changes pushed to GitHub/GitLab
- [ ] You have VPS access (`ssh root@72.60.233.210`)
- [ ] You know your database password

After deploying:
- [ ] Service is running (`systemctl status pms`)
- [ ] No errors in logs (`journalctl -u pms`)
- [ ] App responds (`curl http://localhost:3000`)
- [ ] Browser shows app (`http://72.60.233.210`)
- [ ] Login works
- [ ] Key features work

---

**Last Updated:** October 2025  
**Deployment Method:** Git-based  
**VPS:** root@72.60.233.210















