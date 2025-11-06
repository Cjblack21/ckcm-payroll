# ✅ ERROR-FREE Git Deployment Commands
## For payrollmanagement.space (72.60.233.210)

---

## 🎯 Your Commands Are CORRECT!

Your approach is **BETTER** because it uses Git. Here's the optimized version:

---

## 📋 STEP 1: Push Changes (Windows PC)

```powershell
cd "D:\pms (test 1)"

# Check what changed
git status

# Add all changes
git add .

# Commit
git commit -m "Update: [describe your changes]"

# Push to repository
git push origin main
```

---

## 🚀 STEP 2: Deploy on VPS (Single Command Block)

```bash
ssh root@72.60.233.210 << 'EOF'
cd /var/www/pms
git pull origin main
npm ci --production=false
npx prisma generate
npx prisma db push --accept-data-loss
npm run build
systemctl restart pms
systemctl status pms
EOF
```

**OR** run commands one by one:

```bash
ssh root@72.60.233.210
cd /var/www/pms
git pull origin main
npm ci --production=false
npx prisma generate
npx prisma db push --accept-data-loss
npm run build
systemctl restart pms
systemctl status pms
```

---

## 🔧 Improvements to Your Original Commands

### ❌ Your Version:
```bash
npm install
```

### ✅ Better Version:
```bash
npm ci --production=false
```

**Why?** 
- `npm ci` is faster and more reliable for production
- Uses exact versions from `package-lock.json`
- Prevents version mismatches

---

### ❌ Missing Commands:
You should add:
```bash
npx prisma generate          # Regenerate Prisma client
npx prisma db push           # Update database schema
```

**Why?**
- Prisma client needs regeneration after updates
- Database schema might have changed

---

## ✅ COMPLETE ERROR-FREE SEQUENCE

```bash
# 1. Connect
ssh root@72.60.233.210

# 2. Navigate
cd /var/www/pms

# 3. Pull latest code
git pull origin main

# 4. Install dependencies (exact versions)
npm ci --production=false

# 5. Regenerate Prisma client
npx prisma generate

# 6. Update database schema
npx prisma db push --accept-data-loss

# 7. Build application
npm run build

# 8. Restart service
systemctl restart pms

# 9. Verify it's running
systemctl status pms

# 10. Check logs for errors
journalctl -u pms -n 20 --no-pager
```

---

## 🚀 ONE-LINE DEPLOY (Copy-Paste Ready)

```bash
ssh root@72.60.233.210 "cd /var/www/pms && git pull origin main && npm ci --production=false && npx prisma generate && npx prisma db push --accept-data-loss && npm run build && systemctl restart pms && systemctl status pms"
```

---

## 🔍 Verification Commands

```bash
# Check service status
systemctl status pms

# View recent logs
journalctl -u pms -n 30

# Test local response
curl -I http://localhost:3000

# Check Nginx
systemctl status nginx
```

**Then test in browser:** `https://payrollmanagement.space`

---

## 🛠️ If Something Goes Wrong

### Build Fails:
```bash
cd /var/www/pms
rm -rf .next node_modules
npm install
npx prisma generate
npm run build
systemctl restart pms
```

### Service Won't Start:
```bash
journalctl -u pms -n 50 --no-pager
systemctl restart pms
```

### Database Error:
```bash
cd /var/www/pms
npx prisma db push --force-reset  # ⚠️ Resets database!
```

### Rollback to Previous Version:
```bash
cd /var/www/pms
git log --oneline -5                    # See recent commits
git reset --hard HEAD~1                 # Go back 1 commit
npm ci --production=false
npx prisma generate
npm run build
systemctl restart pms
```

---

## 📊 Comparison

| Your Commands | Optimized Commands | Why Better? |
|---------------|-------------------|-------------|
| `npm install` | `npm ci --production=false` | Exact versions, faster |
| ❌ Missing | `npx prisma generate` | Required for Prisma updates |
| ❌ Missing | `npx prisma db push` | Updates database schema |
| ✅ Correct | `npm run build` | Same |
| ✅ Correct | `systemctl restart pms` | Same |

---

## ✅ Your Commands Work, But Add These:

```diff
ssh root@72.60.233.210
cd /var/www/pms
git pull origin main
- npm install
+ npm ci --production=false
+ npx prisma generate
+ npx prisma db push --accept-data-loss
npm run build
systemctl restart pms
+ systemctl status pms
```

---

## 🎯 Success Indicators

✅ `git pull` → Shows files updated or "Already up to date"  
✅ `npm ci` → Completes without errors  
✅ `npm run build` → Shows "Compiled successfully"  
✅ `systemctl status pms` → **Active: active (running)** in green  
✅ Browser → `https://payrollmanagement.space` loads  

---

**Your approach is correct! Just add the Prisma commands for a complete deployment.**
