# 🔄 PMS Redeployment Guide
## Updating Your Existing VPS Deployment

---

## 📋 Quick Steps Overview

1. **Package updated files** on your local machine
2. **Upload to VPS**
3. **Run update script**
4. **Verify deployment**

---

## 🚀 Method 1: Automated Update (Recommended)

### Step 1: Package Your Updated Files

On your **Windows PC**, open PowerShell:

```powershell
# Navigate to project
cd "D:\pms (test 1)"

# Create fresh archive (exclude development files)
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=prisma/dev.db -czf pms-deploy.tar.gz .
```

### Step 2: Upload Files to VPS

```powershell
# Upload the archive and update script
scp .\pms-deploy.tar.gz root@72.60.233.210:/root/
scp .\deploy\UPDATE-DEPLOYMENT.sh root@72.60.233.210:/root/
```

### Step 3: Run Update on VPS

```bash
# SSH into VPS
ssh root@72.60.233.210

# Make script executable
chmod +x /root/UPDATE-DEPLOYMENT.sh

# Edit the script to set your database password
nano /root/UPDATE-DEPLOYMENT.sh
# Update DB_PASS to match your existing database password

# Run the update
bash /root/UPDATE-DEPLOYMENT.sh
```

**That's it!** The script will:
- ✅ Backup your database and environment
- ✅ Deploy updated files
- ✅ Install new dependencies
- ✅ Update database schema (if changed)
- ✅ Rebuild the application
- ✅ Restart the service

### Step 4: Verify Update

```bash
# Check if service is running
systemctl status pms

# Check logs for any errors
journalctl -u pms -f

# Test in browser
# Visit: http://72.60.233.210
```

---

## 🔧 Method 2: Manual Update (Step by Step)

If you prefer more control or want to understand each step:

### 1. Backup Current System

```bash
ssh root@72.60.233.210

# Create backup directory
BACKUP_DIR="/root/pms-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

# Backup database
mysqldump -u pms_user -p ckcm_payroll > "${BACKUP_DIR}/database-backup.sql"

# Backup .env
cp /var/www/pms/.env "${BACKUP_DIR}/.env.backup"

# Backup current application (optional)
tar -czf "${BACKUP_DIR}/app-backup.tar.gz" -C /var/www pms
```

### 2. Deploy Updated Files

```bash
# Stop service temporarily (optional, for safety)
systemctl stop pms

# Extract updated files
cd /var/www/pms
tar -xzf /root/pms-deploy.tar.gz -C /var/www/pms --overwrite
```

### 3. Update Dependencies

```bash
cd /var/www/pms

# Install/update dependencies
npm ci --production=false

# Regenerate Prisma Client
npx prisma generate

# Update database schema (if schema.prisma changed)
npx prisma db push
```

### 4. Rebuild Application

```bash
cd /var/www/pms
npm run build
```

### 5. Restart Service

```bash
systemctl start pms
systemctl status pms
```

---

## 🔍 Verification Checklist

After deployment, verify:

### 1. Service Status
```bash
systemctl status pms
```
Expected: `Active: active (running)` in green

### 2. Application Logs
```bash
journalctl -u pms -n 50
```
Expected: No errors, "Ready" or "compiled successfully" messages

### 3. Nginx Status
```bash
systemctl status nginx
```
Expected: Active and running

### 4. Database Connection
```bash
mysql -u pms_user -p ckcm_payroll
# Enter your password
SHOW TABLES;
exit;
```
Expected: All tables listed

### 5. Browser Test
Visit: `http://72.60.233.210`
Expected: Login page loads correctly

### 6. Test Login
- Use your existing credentials
- Verify all features work

---

## 📊 What Gets Updated

Based on your git status, these components will be updated:

### Database Schema
- ✅ `prisma/schema.prisma` - Database structure updates
- ✅ `prisma/seed.ts` - Seed data updates

### Admin Pages
- ✅ Dashboard
- ✅ Payroll management
- ✅ Deductions management
- ✅ Attendance tracking

### API Routes
- ✅ Attendance settings API
- ✅ Attendance tracking APIs
- ✅ Deduction types API
- ✅ Payroll breakdown API

### Components & Libraries
- ✅ Payroll breakdown dialog
- ✅ Payroll actions
- ✅ Timezone handling
- ✅ Middleware updates

---

## 🛠️ Troubleshooting

### Issue: Service Won't Start

```bash
# Check detailed logs
journalctl -u pms -n 100 --no-pager

# Common fixes:
# 1. Check if port 3000 is available
netstat -tlnp | grep 3000

# 2. Verify .env file exists and has correct permissions
ls -la /var/www/pms/.env
chmod 600 /var/www/pms/.env

# 3. Check database connection
mysql -u pms_user -p ckcm_payroll

# 4. Rebuild application
cd /var/www/pms
npm run build
systemctl restart pms
```

### Issue: Build Fails

```bash
# Clear build cache and rebuild
cd /var/www/pms
rm -rf .next
npm run build

# If dependencies issue:
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Database Schema Error

```bash
# Reset and reapply schema
cd /var/www/pms
npx prisma db push --force-reset

# Warning: This will delete all data!
# Better option: Restore from backup, then push schema
mysql -u pms_user -p ckcm_payroll < /root/pms-backups/[timestamp]/database-backup.sql
npx prisma db push
```

### Issue: 502 Bad Gateway

```bash
# Verify app is running
systemctl status pms

# Check if app is listening on port 3000
curl http://localhost:3000

# Check Nginx configuration
nginx -t
systemctl status nginx

# Restart both services
systemctl restart pms
systemctl restart nginx
```

---

## 🔄 Rollback Procedure

If something goes wrong, you can rollback:

```bash
# Stop service
systemctl stop pms

# Restore database
mysql -u pms_user -p ckcm_payroll < /root/pms-backups/[timestamp]/database-backup.sql

# Restore application files (if you created app backup)
cd /var/www
rm -rf pms
tar -xzf /root/pms-backups/[timestamp]/app-backup.tar.gz

# Restore .env
cp /root/pms-backups/[timestamp]/.env.backup /var/www/pms/.env

# Restart service
systemctl start pms
```

---

## 📝 Important Notes

### Database Password
- Make sure to use the **same database password** as your initial deployment
- If you forgot it, you can find it in `/var/www/pms/.env` on the VPS

### Environment Variables
- The update script preserves your `.env` file
- Your NEXTAUTH_SECRET and other settings remain unchanged
- If you need to update env vars, edit `/var/www/pms/.env` manually

### Backups
- Backups are stored in `/root/pms-backups/[timestamp]/`
- Keep at least 2-3 recent backups
- Old backups can be deleted to save space

### Zero Downtime (Optional)
For production with users online:
```bash
# Build first, then restart quickly
cd /var/www/pms
npm run build
systemctl restart pms  # Quick restart
```

---

## 🎯 Quick Reference Commands

```bash
# Update deployment (all-in-one)
bash /root/UPDATE-DEPLOYMENT.sh

# Check status
systemctl status pms

# View logs
journalctl -u pms -f

# Restart service
systemctl restart pms

# Rebuild app
cd /var/www/pms && npm run build && systemctl restart pms

# Check Nginx
systemctl status nginx
tail -f /var/log/nginx/pms-error.log

# Database access
mysql -u pms_user -p ckcm_payroll
```

---

## ✅ Success Indicators

You'll know the update succeeded when:

1. ✅ Service status shows "active (running)"
2. ✅ No errors in `journalctl -u pms -f`
3. ✅ Website loads at `http://72.60.233.210`
4. ✅ You can login with existing credentials
5. ✅ All features work as expected

---

## 🆘 Need Help?

If issues persist:

1. **Check logs**: `journalctl -u pms -n 100 --no-pager`
2. **Check Nginx**: `tail -f /var/log/nginx/pms-error.log`
3. **Verify database**: `mysql -u pms_user -p ckcm_payroll`
4. **Check .env**: `cat /var/www/pms/.env`
5. **Restore backup** if needed

---

**Last Updated**: October 2025  
**VPS IP**: 72.60.233.210  
**App Location**: /var/www/pms















