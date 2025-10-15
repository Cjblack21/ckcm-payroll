# 🚀 Complete Deployment Guide for PMS
## CKCM Payroll Management System - VPS Deployment

---

## 📋 Prerequisites

- VPS IP: `72.60.233.210`
- SSH access: `root@72.60.233.210`
- Ubuntu/Debian OS (18.04+)
- Domain name (optional, for SSL)

---

## 🎯 Deployment Options

### Option A: Automated Deployment (Recommended)
Use the master script for one-command deployment.

### Option B: Step-by-Step Manual Deployment
Follow each phase individually for learning/debugging.

---

## 🚀 OPTION A: Automated Deployment

### Step 1: Prepare on Your Windows PC

```powershell
# Navigate to project
cd "D:\pms (test 1)"

# Create archive (exclude node_modules)
tar --exclude=node_modules --exclude=.next --exclude=.git -czf pms-deploy.tar.gz .

# Upload files to VPS
scp .\pms-deploy.tar.gz root@72.60.233.210:/root/
scp .\ckcm_payroll.sql root@72.60.233.210:/root/
scp .\deploy\DEPLOY.sh root@72.60.233.210:/root/
```

### Step 2: Configure Deployment Script

```bash
# SSH to VPS
ssh root@72.60.233.210

# Edit the DEPLOY.sh script
nano /root/DEPLOY.sh

# Update these values:
# - DB_PASS: Set a strong database password
# - DOMAIN: Your domain name (if you have one)
# - ENABLE_SSL: Set to "true" if you have a domain
```

### Step 3: Run Deployment

```bash
# Make script executable
chmod +x /root/DEPLOY.sh

# Run deployment
bash /root/DEPLOY.sh
```

**That's it!** The script will:
1. Install all dependencies (Node, Nginx, MySQL)
2. Create database and import your data
3. Deploy and build the application
4. Configure systemd service
5. Set up Nginx reverse proxy
6. (Optional) Configure SSL certificate

### Step 4: Verify Deployment

```bash
# Check service status
systemctl status pms

# Check application logs
journalctl -u pms -f

# Test the application
curl http://localhost:3000
```

### Step 5: Access Your Application

Open browser and visit: `http://72.60.233.210`

---

## 🔧 OPTION B: Manual Step-by-Step Deployment

### Phase 1: Prepare Local Files

```powershell
# On Windows PC
cd "D:\pms (test 1)"
tar --exclude=node_modules --exclude=.next --exclude=.git -czf pms-deploy.tar.gz .

# Upload all files
scp .\pms-deploy.tar.gz root@72.60.233.210:/root/
scp .\ckcm_payroll.sql root@72.60.233.210:/root/
scp .\deploy\*.sh root@72.60.233.210:/root/
```

### Phase 2: VPS Provisioning

```bash
ssh root@72.60.233.210
chmod +x /root/*.sh
bash /root/01-provision-vps.sh
```

### Phase 3: Database Setup

```bash
# Edit database credentials
nano /root/02-setup-database.sh
# Update DB_PASS to a strong password

# Run setup
bash /root/02-setup-database.sh
```

### Phase 4: Deploy Application

```bash
bash /root/03-deploy-app.sh
```

### Phase 5: Configure Environment

```bash
# Edit environment configuration
nano /root/04-configure-env.sh
# Update DB_PASS, SERVER_IP, and other settings

# Run configuration
bash /root/04-configure-env.sh
```

### Phase 6: Setup Service

```bash
bash /root/05-setup-service.sh
systemctl start pms
systemctl status pms
```

### Phase 7: Configure Nginx

```bash
bash /root/06-setup-nginx.sh
```

### Phase 8: SSL Setup (Optional)

```bash
# Only if you have a domain
nano /root/07-setup-ssl.sh
# Update DOMAIN variable
bash /root/07-setup-ssl.sh
```

---

## 🔍 Post-Deployment Verification

### 1. Check Service Status

```bash
systemctl status pms
```

Expected: `Active: active (running)`

### 2. Check Application Logs

```bash
journalctl -u pms -f
```

Expected: No errors, server running on port 3000

### 3. Check Nginx

```bash
systemctl status nginx
nginx -t
```

Expected: Both active and configuration test successful

### 4. Test Database Connection

```bash
mysql -u pms_user -p ckcm_payroll
# Enter your DB_PASS when prompted
SHOW TABLES;
exit;
```

Expected: List of tables from your schema

### 5. Access Application

```bash
curl http://localhost:3000
```

Expected: HTML response from Next.js

### 6. Browser Test

Visit: `http://72.60.233.210`

Expected: Login page of your PMS

---

## 🔐 Default Login Credentials

From your seed data:

**Admin Account:**
- Email: `admin@pms.com`
- Password: `password123`

**Personnel Accounts:**
- Email: `john.doe@pms.com`
- Password: `password123`

⚠️ **Change these passwords immediately after first login!**

---

## 🛠️ Troubleshooting

### Issue: Service won't start

```bash
# Check logs for errors
journalctl -u pms -n 50

# Check if port 3000 is available
netstat -tlnp | grep 3000

# Restart service
systemctl restart pms
```

### Issue: 502 Bad Gateway

```bash
# Check if app is running
systemctl status pms

# Check Nginx error logs
tail -f /var/log/nginx/pms-error.log

# Verify proxy_pass in Nginx config
cat /etc/nginx/sites-available/pms
```

### Issue: Database connection error

```bash
# Test database credentials
mysql -u pms_user -p ckcm_payroll

# Check .env file
cat /var/www/pms/.env

# Restart application
systemctl restart pms
```

### Issue: Application crashes on startup

```bash
# Check detailed logs
journalctl -u pms -n 100 --no-pager

# Check if dependencies installed
cd /var/www/pms
npm ls

# Rebuild application
npm run build
systemctl restart pms
```

---

## 📝 Useful Commands

### Service Management

```bash
systemctl start pms      # Start service
systemctl stop pms       # Stop service
systemctl restart pms    # Restart service
systemctl status pms     # Check status
journalctl -u pms -f     # Follow logs
```

### Nginx Management

```bash
systemctl reload nginx   # Reload config
nginx -t                 # Test config
tail -f /var/log/nginx/pms-error.log
```

### Database Management

```bash
mysql -u pms_user -p ckcm_payroll
# Backup database
mysqldump -u pms_user -p ckcm_payroll > backup.sql
```

### Application Updates

```bash
cd /var/www/pms
git pull  # If using git
npm install
npm run build
systemctl restart pms
```

---

## 🔒 Security Checklist

- [ ] Changed default MySQL password
- [ ] Changed default admin password
- [ ] Set strong NEXTAUTH_SECRET
- [ ] Configured firewall (UFW)
- [ ] Installed SSL certificate (if domain available)
- [ ] Restricted .env file permissions (600)
- [ ] Disabled root SSH login (recommended)
- [ ] Set up automated backups

---

## 📞 Support

For issues or questions:
1. Check logs: `journalctl -u pms -f`
2. Review Nginx errors: `/var/log/nginx/pms-error.log`
3. Verify database connection
4. Check environment variables in `.env`

---

## 🎉 Success!

Your PMS is now deployed and running!

**Access URL:** `http://72.60.233.210`

Remember to:
- Change default passwords
- Set up SSL if you have a domain
- Configure automated database backups
- Monitor logs regularly

---

**Deployed by:** Legendary System v2.1.0  
**Date:** $(date)
