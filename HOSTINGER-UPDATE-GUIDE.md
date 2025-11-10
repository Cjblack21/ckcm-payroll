# 🚀 Hostinger VPS Update Deployment Guide
## CKCM Payroll Management System - Deploying Updated Code

---

## 📋 Overview

This guide will help you deploy your **updated code** to your existing Hostinger VPS deployment **error-free**. Since you've already deployed before, this focuses on updating the system with your latest changes.

**Server Details:**
- IP: `72.60.233.210`
- Path: `/var/www/pms`
- Service: PM2 (pms)
- Database: MySQL (ckcm_payroll)

---

## ✅ Pre-Deployment Checklist

Before deploying, ensure:

### 1. Local Testing
```powershell
# Test your app locally
npm run dev

# Test build process
npm run build

# Check for TypeScript errors
npm run lint
```

### 2. Git Status
```powershell
# Check for uncommitted changes
git status

# Commit all changes
git add .
git commit -m "Your update description"

# Push to main branch
git push origin main
```

### 3. Environment Variables
- [ ] `.env` file on server is up to date
- [ ] No new environment variables needed (or added to server)
- [ ] Database credentials are correct

---

## 🚀 DEPLOYMENT METHOD 1: Automated Script (RECOMMENDED)

This is the **easiest and safest** method. The script handles everything automatically.

### Step 1: Prepare the Script

```powershell
# On your Windows PC, navigate to project
cd "D:\pms (test 1)"

# Make sure you have the latest code
git pull origin main

# The script is already created: DEPLOY-UPDATE.sh
```

### Step 2: Run Deployment

**Option A: Using Git Bash (Recommended)**
```bash
bash DEPLOY-UPDATE.sh
```

**Option B: Using WSL**
```bash
bash DEPLOY-UPDATE.sh
```

**Option C: Using PowerShell**
```powershell
# Install Git for Windows if not already installed
# Then run in Git Bash
bash DEPLOY-UPDATE.sh
```

### Step 3: Monitor Progress

The script will:
1. ✅ Create automatic backup (database + code)
2. ✅ Pull latest code from Git
3. ✅ Clean build cache
4. ✅ Install dependencies
5. ✅ Update database schema
6. ✅ Build application
7. ✅ Restart PM2 service
8. ✅ Show status and logs

**Expected Output:**
```
╔════════════════════════════════════════════════╗
║  ✅ DEPLOYMENT FINISHED SUCCESSFULLY!         ║
║  🌐 Your app is now live at your domain      ║
╚════════════════════════════════════════════════╝
```

---

## 🔧 DEPLOYMENT METHOD 2: Manual Steps

If the automated script fails or you prefer manual control:

### Step 1: Connect to VPS

```powershell
ssh root@72.60.233.210
```

### Step 2: Navigate to Project

```bash
cd /var/www/pms
```

### Step 3: Backup Current State

```bash
# Create backup directory
BACKUP_DIR="/root/pms-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

# Backup database
mysqldump -u pms_user -p ckcm_payroll > "${BACKUP_DIR}/database-backup.sql"

# Backup .env
cp .env "${BACKUP_DIR}/.env.backup"

# Note current git commit
git rev-parse HEAD > "${BACKUP_DIR}/git-commit.txt"
```

### Step 4: Pull Latest Code

```bash
# Stash any local changes
git stash

# Pull from main branch
git pull origin main

# Check current commit
git log -1 --oneline
```

### Step 5: Clean and Rebuild

```bash
# Remove old build
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
npm install --legacy-peer-deps

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build application
NODE_ENV=production npm run build
```

### Step 6: Restart Application

```bash
# Restart PM2 process
pm2 restart pms

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs pms --lines 50
```

---

## 🔍 Post-Deployment Verification

After deployment, verify everything works:

### 1. Check PM2 Status

```bash
ssh root@72.60.233.210
pm2 status
```

**Expected:** Status should be `online`

### 2. Check Application Logs

```bash
pm2 logs pms --lines 50
```

**Expected:** No errors, server running on port 3000

### 3. Test Website

Open browser and visit: `http://72.60.233.210`

**Test Checklist:**
- [ ] Homepage loads correctly
- [ ] Login page appears
- [ ] Can login with credentials
- [ ] Admin dashboard accessible
- [ ] Personnel dashboard works
- [ ] Payroll features functional
- [ ] No console errors (F12 Developer Tools)

### 4. Monitor for 5 Minutes

```bash
pm2 monit
```

Watch for:
- Memory usage stable
- No automatic restarts
- No error spikes

---

## 🛠️ Troubleshooting

### Issue: Build Fails

**Symptoms:** Error during `npm run build`

**Solution:**
```bash
ssh root@72.60.233.210
cd /var/www/pms

# Clear everything
rm -rf .next node_modules

# Reinstall
npm install --legacy-peer-deps

# Rebuild
npm run build

# Restart
pm2 restart pms
```

### Issue: Database Migration Error

**Symptoms:** Prisma migration fails

**Solution:**
```bash
# Check database connection
npx prisma db pull

# Force push schema (⚠️ use carefully)
npx prisma db push --accept-data-loss

# Or reset migrations
npx prisma migrate reset --force
npx prisma migrate deploy
```

### Issue: PM2 Process Not Running

**Symptoms:** `pm2 status` shows `errored` or `stopped`

**Solution:**
```bash
# Check detailed logs
pm2 logs pms --lines 100

# Delete and recreate process
pm2 delete pms
pm2 start npm --name "pms" -- start
pm2 save

# Check port availability
netstat -tlnp | grep 3000
```

### Issue: 502 Bad Gateway

**Symptoms:** Nginx shows 502 error

**Solution:**
```bash
# Check if app is running
pm2 status

# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Restart both services
pm2 restart pms
sudo systemctl restart nginx
```

### Issue: Out of Memory

**Symptoms:** App crashes with memory errors

**Solution:**
```bash
# Increase Node memory limit
pm2 delete pms
pm2 start npm --name "pms" --max-memory-restart 1G -- start
pm2 save

# Check server memory
free -h
```

### Issue: Port 3000 Already in Use

**Symptoms:** Cannot start on port 3000

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Restart PM2
pm2 restart pms
```

---

## 🔄 Rollback Procedure

If deployment breaks your app, rollback to previous version:

### Option 1: Use Rollback Script

```bash
bash rollback.sh
```

### Option 2: Manual Rollback

```bash
ssh root@72.60.233.210
cd /var/www/pms

# Go back one commit
git reset --hard HEAD~1

# Or go to specific commit
git reset --hard <commit-hash>

# Reinstall and rebuild
npm install --legacy-peer-deps
npm run build
pm2 restart pms
```

### Option 3: Restore from Backup

```bash
# List backups
ls -la /root/pms-backups/

# Restore database
mysql -u pms_user -p ckcm_payroll < /root/pms-backups/YYYYMMDD-HHMMSS/database-backup.sql

# Restore .env
cp /root/pms-backups/YYYYMMDD-HHMMSS/.env.backup /var/www/pms/.env

# Restart
pm2 restart pms
```

---

## 📝 Useful Commands

### Service Management

```bash
# View PM2 status
pm2 status

# Restart application
pm2 restart pms

# Stop application
pm2 stop pms

# View logs (live)
pm2 logs pms

# View logs (last 100 lines)
pm2 logs pms --lines 100

# Monitor resources
pm2 monit

# Save PM2 config
pm2 save
```

### Git Commands

```bash
# Check current branch
git branch

# View recent commits
git log --oneline -10

# Check for changes
git status

# Pull latest code
git pull origin main

# Reset to specific commit
git reset --hard <commit-hash>
```

### Database Commands

```bash
# Connect to database
mysql -u pms_user -p ckcm_payroll

# Backup database
mysqldump -u pms_user -p ckcm_payroll > backup.sql

# Restore database
mysql -u pms_user -p ckcm_payroll < backup.sql

# Check Prisma schema
npx prisma db pull

# Push schema changes
npx prisma db push
```

### System Monitoring

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check running processes
ps aux | grep node

# Check port usage
netstat -tlnp | grep 3000
```

---

## 🔐 Security Best Practices

### Before Deployment

- [ ] Review code for security vulnerabilities
- [ ] No hardcoded credentials in code
- [ ] Environment variables properly set
- [ ] Database credentials secure

### After Deployment

- [ ] Change default passwords
- [ ] Monitor logs for suspicious activity
- [ ] Keep backups up to date
- [ ] Update dependencies regularly

---

## 📊 Deployment Checklist

Use this checklist for every deployment:

### Pre-Deployment
- [ ] All changes committed to Git
- [ ] Pushed to main branch
- [ ] Local build successful
- [ ] No TypeScript errors
- [ ] Environment variables checked

### During Deployment
- [ ] Backup created automatically
- [ ] Code pulled successfully
- [ ] Dependencies installed
- [ ] Database migrations applied
- [ ] Build completed without errors
- [ ] PM2 restarted successfully

### Post-Deployment
- [ ] PM2 status shows "online"
- [ ] No errors in logs
- [ ] Website loads correctly
- [ ] Login works
- [ ] Critical features tested
- [ ] Monitored for 5 minutes

---

## 🆘 Emergency Contacts & Info

**Server Information:**
- IP Address: `72.60.233.210`
- SSH User: `root`
- App Directory: `/var/www/pms`
- PM2 Process: `pms`
- Database: `ckcm_payroll`
- Database User: `pms_user`

**Important Paths:**
- Application: `/var/www/pms`
- Backups: `/root/pms-backups/`
- Nginx Config: `/etc/nginx/sites-available/pms`
- Nginx Logs: `/var/log/nginx/`
- PM2 Logs: `~/.pm2/logs/`

**Quick Commands:**
```bash
# SSH to server
ssh root@72.60.233.210

# View logs
pm2 logs pms

# Restart app
pm2 restart pms

# Check status
pm2 status

# Rollback
bash rollback.sh
```

---

## 🎯 Common Deployment Scenarios

### Scenario 1: Minor Code Changes (UI/Logic)

**Steps:**
1. Commit and push changes
2. Run `bash DEPLOY-UPDATE.sh`
3. Verify website works

**Time:** ~3-5 minutes

### Scenario 2: Database Schema Changes

**Steps:**
1. Update Prisma schema
2. Create migration: `npx prisma migrate dev`
3. Commit and push
4. Run `bash DEPLOY-UPDATE.sh`
5. Verify database changes

**Time:** ~5-10 minutes

### Scenario 3: New Dependencies Added

**Steps:**
1. Add dependencies to `package.json`
2. Test locally
3. Commit and push
4. Run `bash DEPLOY-UPDATE.sh`
5. Verify new features work

**Time:** ~5-10 minutes

### Scenario 4: Environment Variable Changes

**Steps:**
1. SSH to server: `ssh root@72.60.233.210`
2. Edit `.env`: `nano /var/www/pms/.env`
3. Add/update variables
4. Save and exit
5. Restart: `pm2 restart pms`

**Time:** ~2 minutes

---

## 📈 Performance Optimization Tips

### After Deployment

1. **Monitor Memory Usage**
   ```bash
   pm2 monit
   ```

2. **Check Build Size**
   ```bash
   du -sh /var/www/pms/.next
   ```

3. **Optimize Database**
   ```bash
   mysql -u pms_user -p ckcm_payroll
   OPTIMIZE TABLE Personnel, Payroll, Attendance;
   ```

4. **Clear Old Logs**
   ```bash
   pm2 flush pms
   ```

---

## 🎉 Success Indicators

Your deployment is successful when:

✅ PM2 shows status as `online`  
✅ No errors in `pm2 logs pms`  
✅ Website loads at `http://72.60.233.210`  
✅ Login functionality works  
✅ Database queries execute  
✅ All features operational  
✅ No memory leaks after 10 minutes  
✅ Response times are normal  

---

## 📞 Support & Resources

### Documentation
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- PM2: https://pm2.keymetrics.io/docs

### Logs Location
- PM2 Logs: `~/.pm2/logs/pms-out.log`
- PM2 Errors: `~/.pm2/logs/pms-error.log`
- Nginx Access: `/var/log/nginx/access.log`
- Nginx Error: `/var/log/nginx/error.log`

### Backup Strategy
- Automatic backups before each deployment
- Manual backups: Run backup script before major changes
- Keep last 7 days of backups
- Test restore procedure monthly

---

## 🚀 Quick Start Summary

**For experienced users, here's the TL;DR:**

```bash
# 1. Commit and push your changes
git add .
git commit -m "Update description"
git push origin main

# 2. Run deployment script
bash DEPLOY-UPDATE.sh

# 3. Verify deployment
# Visit http://72.60.233.210 and test

# That's it! 🎉
```

---

**Last Updated:** November 2024  
**Version:** 2.0  
**Maintained by:** CKCM Development Team
