# ✅ ERROR-FREE Redeployment Steps
## payrollmanagement.space

---

## 🎯 Prerequisites Check

Before starting, verify on your **Windows PC**:

```powershell
cd "D:\pms (test 1)"

# Test build locally first (CRITICAL!)
npm run build
```

**⚠️ STOP HERE if build fails! Fix errors before deploying.**

---

## 📦 STEP 1: Package Updated Files (Windows PC)

```powershell
cd "D:\pms (test 1)"

# Create deployment archive
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=prisma/dev.db --exclude=.env --exclude=.env.backup -czf pms-deploy.tar.gz .

# Upload to VPS
scp .\pms-deploy.tar.gz root@payrollmanagement.space:/root/
```

---

## 🚀 STEP 2: Deploy on VPS (Terminal Commands)

### Connect to VPS:
```bash
ssh root@payrollmanagement.space
```

### Run these commands ONE BY ONE:

```bash
# 1. Create backup
BACKUP_DIR="/root/pms-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

# 2. Backup database (REPLACE PASSWORD!)
mysqldump -u pms_user -p'YOUR_DB_PASSWORD' ckcm_payroll > "${BACKUP_DIR}/db-backup.sql"

# 3. Backup .env
cp /var/www/pms/.env "${BACKUP_DIR}/.env.backup"

# 4. Stop service
systemctl stop pms

# 5. Extract new files
cd /var/www/pms
tar -xzf /root/pms-deploy.tar.gz --overwrite

# 6. Restore .env
cp "${BACKUP_DIR}/.env.backup" /var/www/pms/.env

# 7. Install dependencies
npm ci --production=false

# 8. Generate Prisma
npx prisma generate

# 9. Update database schema
npx prisma db push --accept-data-loss

# 10. Build application
npm run build

# 11. Start service
systemctl start pms

# 12. Check status
systemctl status pms
```

---

## ✅ STEP 3: Verify Deployment

```bash
# 1. Check service is running
systemctl status pms

# 2. Check logs for errors
journalctl -u pms -n 30 --no-pager

# 3. Test local response
curl -I http://localhost:3000

# 4. Check Nginx
systemctl status nginx
```

### Test in Browser:
Open: `https://payrollmanagement.space`

**Expected:** Login page loads, no errors

---

## 🔥 ONE-LINE DEPLOY (Use if confident)

**⚠️ Only use if you've tested locally and are confident!**

```bash
ssh root@payrollmanagement.space "cd /var/www/pms && systemctl stop pms && tar -xzf /root/pms-deploy.tar.gz --overwrite && npm ci --production=false && npx prisma generate && npx prisma db push --accept-data-loss && npm run build && systemctl start pms && systemctl status pms"
```

---

## 🛠️ Quick Fixes

### If Service Won't Start:

```bash
# Check logs
journalctl -u pms -n 50 --no-pager

# Regenerate Prisma
cd /var/www/pms
npx prisma generate
systemctl restart pms
```

### If Build Fails:

```bash
cd /var/www/pms
rm -rf .next node_modules
npm install
npx prisma generate
npm run build
systemctl restart pms
```

### If Database Error:

```bash
cd /var/www/pms
npx prisma db push --force-reset  # ⚠️ Deletes data!
# OR restore backup:
mysql -u pms_user -p ckcm_payroll < /root/pms-backups/[timestamp]/db-backup.sql
```

---

## 🔄 Rollback (If Something Goes Wrong)

```bash
# Stop service
systemctl stop pms

# Restore database
mysql -u pms_user -p ckcm_payroll < /root/pms-backups/[TIMESTAMP]/db-backup.sql

# Restore .env
cp /root/pms-backups/[TIMESTAMP]/.env.backup /var/www/pms/.env

# Restart
systemctl start pms
```

---

## 📋 Post-Deployment Checklist

- [ ] Service running: `systemctl status pms` shows green
- [ ] No errors in logs: `journalctl -u pms -n 20`
- [ ] Website loads: `https://payrollmanagement.space`
- [ ] Can login with credentials
- [ ] All features work

---

## 🎯 Success Indicators

✅ `systemctl status pms` → **Active: active (running)** in green  
✅ `journalctl -u pms` → No errors, shows "Ready" or "compiled"  
✅ `curl http://localhost:3000` → Returns HTML  
✅ Browser → Website loads and works  

---

**Backup Location:** `/root/pms-backups/[timestamp]/`  
**App Location:** `/var/www/pms`  
**Service Name:** `pms.service`
