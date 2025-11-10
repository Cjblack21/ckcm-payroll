# 🚀 ERROR-FREE DEPLOYMENT GUIDE
## Deploy to Hostinger VPS (72.60.233.210)

---

## 🎯 Quick Deploy (Recommended)

### Option 1: Automated Script (Easiest)

```bash
# From your Windows PC in Git Bash or PowerShell
cd "D:\pms (test 1)"
bash DEPLOY-ERROR-FREE.sh
```

**That's it!** The script will:
- ✅ Test build locally first
- ✅ Push to Git
- ✅ Deploy to VPS
- ✅ Restart the app
- ✅ Show you the status

---

## 📋 Manual Deployment (If script fails)

### Step 1: Test Locally First (CRITICAL!)

```bash
cd "D:\pms (test 1)"
npm run build
```

**⚠️ If this fails, DO NOT deploy!** Fix the errors first.

### Step 2: Push to Git

```bash
git add .
git commit -m "Deploy update"
git push origin main
```

### Step 3: Deploy on VPS

```bash
# Connect to VPS
ssh root@72.60.233.210

# Navigate to app
cd /var/www/pms

# Pull latest code
git pull origin main

# Clean old files
rm -rf .next node_modules/.cache

# Install dependencies
npm install --legacy-peer-deps

# Generate Prisma
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build app
NODE_ENV=production npm run build

# Restart app
pm2 restart pms
# OR if using systemd:
# systemctl restart pms

# Check status
pm2 status
pm2 logs pms --lines 30
```

---

## ✅ Verify Deployment

After deploying, check:

1. **Visit website**: https://payrollmanagement.space
2. **Test login**: Use your credentials
3. **Check features**: Navigate through the app
4. **Monitor logs**: Watch for errors

```bash
# On VPS, check logs
ssh root@72.60.233.210
pm2 logs pms --lines 50
# OR
journalctl -u pms -f
```

---

## 🔧 Troubleshooting

### Problem: Build fails on VPS

**Solution:**
```bash
ssh root@72.60.233.210
cd /var/www/pms

# Clear everything
rm -rf .next node_modules

# Reinstall
npm install --legacy-peer-deps
npx prisma generate
npm run build

# Restart
pm2 restart pms
```

### Problem: Database connection error

**Solution:**
```bash
ssh root@72.60.233.210
cd /var/www/pms

# Check .env file
cat .env | grep DATABASE_URL

# Regenerate Prisma
npx prisma generate
npx prisma migrate deploy

# Restart
pm2 restart pms
```

### Problem: App won't start

**Solution:**
```bash
ssh root@72.60.233.210

# Check what's running
pm2 status
# OR
systemctl status pms

# View logs for errors
pm2 logs pms --lines 100
# OR
journalctl -u pms -n 100

# Force restart
pm2 delete pms
pm2 start npm --name "pms" -- start
pm2 save
```

### Problem: Port 3000 already in use

**Solution:**
```bash
ssh root@72.60.233.210

# Find process using port 3000
lsof -i :3000

# Kill it (replace PID with actual process ID)
kill -9 <PID>

# Restart app
pm2 restart pms
```

### Problem: Out of memory

**Solution:**
```bash
ssh root@72.60.233.210

# Restart with memory limit
pm2 delete pms
pm2 start npm --name "pms" --max-memory-restart 1G -- start
pm2 save
```

---

## 🔄 Rollback (If deployment breaks)

```bash
# Use the rollback script
bash rollback.sh

# OR manually:
ssh root@72.60.233.210
cd /var/www/pms
git reset --hard HEAD~1
npm install --legacy-peer-deps
npm run build
pm2 restart pms
```

---

## 📊 Useful Commands

### Check Status
```bash
ssh root@72.60.233.210

# PM2 commands
pm2 status              # Show all processes
pm2 logs pms            # View logs
pm2 monit               # Monitor in real-time
pm2 restart pms         # Restart app
pm2 stop pms            # Stop app
pm2 start pms           # Start app

# Systemd commands
systemctl status pms    # Check status
systemctl restart pms   # Restart
systemctl stop pms      # Stop
systemctl start pms     # Start
journalctl -u pms -f    # Follow logs
```

### Check Server Health
```bash
ssh root@72.60.233.210

# Disk space
df -h

# Memory usage
free -h

# CPU usage
top

# Nginx status
systemctl status nginx

# Database status
systemctl status mysql
```

---

## 🎯 Environment Variables

Your `.env` file on the VPS should have:

```env
DATABASE_URL="mysql://pms_user:YOUR_PASSWORD@localhost:3306/ckcm_payroll"
NEXTAUTH_URL="https://payrollmanagement.space"
NEXTAUTH_SECRET="your-generated-secret"
NODE_ENV="production"
```

**Location:** `/var/www/pms/.env`

---

## 🔐 Important Information

- **Server IP:** 72.60.233.210
- **Domain:** payrollmanagement.space
- **App Path:** /var/www/pms
- **Process Name:** pms
- **Database:** ckcm_payroll (MySQL)
- **Port:** 3000 (internal)
- **Web Port:** 80/443 (Nginx)

---

## 📝 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Code builds locally: `npm run build`
- [ ] All changes committed: `git status`
- [ ] Changes pushed to Git: `git push origin main`
- [ ] VPS is accessible: `ssh root@72.60.233.210`
- [ ] Database is running on VPS
- [ ] `.env` file exists on VPS

---

## 🆘 Emergency Procedures

### If website is completely down:

```bash
ssh root@72.60.233.210

# 1. Check if app is running
pm2 status
systemctl status pms

# 2. Check Nginx
systemctl status nginx
systemctl restart nginx

# 3. Check database
systemctl status mysql

# 4. Restart everything
pm2 restart pms
systemctl restart nginx

# 5. Check logs
pm2 logs pms --lines 100
tail -f /var/log/nginx/error.log
```

### If database is corrupted:

```bash
ssh root@72.60.233.210

# Restore from backup (if you have one)
mysql -u pms_user -p ckcm_payroll < /root/pms-backups/[timestamp]/db-backup.sql

# OR reset database (⚠️ DELETES ALL DATA!)
cd /var/www/pms
npx prisma db push --force-reset
npm run db:seed
```

---

## 🎉 Success Indicators

You'll know deployment succeeded when:

✅ `pm2 status` shows `pms` as **online** (green)  
✅ `pm2 logs pms` shows no errors  
✅ Website loads at https://payrollmanagement.space  
✅ You can login successfully  
✅ All features work correctly  

---

## 📞 Support

If you encounter issues:

1. **Check logs first**: `pm2 logs pms --lines 100`
2. **Check this guide**: Most issues are covered above
3. **Try rollback**: `bash rollback.sh`
4. **Start fresh**: Clear everything and redeploy

---

## 🔄 Regular Maintenance

### Weekly:
```bash
ssh root@72.60.233.210

# Update system
apt update && apt upgrade -y

# Check disk space
df -h

# Restart if needed
pm2 restart pms
```

### Monthly:
```bash
# Backup database
mysqldump -u pms_user -p ckcm_payroll > /root/backups/backup-$(date +%Y%m%d).sql

# Clean old logs
pm2 flush
```

---

**Last Updated:** 2025-11-11  
**Version:** 1.0 - Error-Free Edition
