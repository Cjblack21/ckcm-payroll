# 🚀 PMS Deployment Guide

## Quick Deploy

### Windows (Git Bash or WSL)
```bash
bash deploy.sh
```

### Linux/Mac
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Manual Deployment Steps

If the script fails, use these manual commands:

```bash
ssh root@72.60.233.210

cd /var/www/pms
git pull origin main
rm -rf .next node_modules/.cache
npm install --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
NODE_ENV=production npm run build
pm2 restart pms
pm2 logs pms --lines 50
```

---

## First Time Setup on VPS

Only run these once when setting up the server:

```bash
# 1. Clone repository
cd /var/www
git clone https://github.com/yourusername/pms.git
cd pms

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Setup environment variables
nano .env
# Add your DATABASE_URL, NEXTAUTH_SECRET, etc.

# 4. Setup database
npx prisma generate
npx prisma migrate deploy

# 5. Build
npm run build

# 6. Start with PM2
pm2 start npm --name "pms" -- start
pm2 save
pm2 startup
```

---

## Troubleshooting

### Build Errors
```bash
# Clear everything and rebuild
ssh root@72.60.233.210
cd /var/www/pms
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run build
pm2 restart pms
```

### Database Issues
```bash
# Reset Prisma client
npx prisma generate --force
npx prisma migrate deploy
```

### PM2 Not Running
```bash
pm2 list
pm2 restart pms
pm2 logs pms
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
# Restart
pm2 restart pms
```

---

## Useful Commands

```bash
# View logs
pm2 logs pms

# Monitor
pm2 monit

# Restart
pm2 restart pms

# Stop
pm2 stop pms

# Delete process
pm2 delete pms

# Check status
pm2 status

# Save PM2 config
pm2 save
```

---

## Environment Variables Required

Create `.env` file on server with:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pms_db"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secret-key-here"
NODE_ENV="production"
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

---

## Rollback

If deployment breaks, use the rollback script:
```bash
bash rollback.sh
```

Or manually:
```bash
ssh root@72.60.233.210
cd /var/www/pms
git reset --hard HEAD~1
npm install --legacy-peer-deps
npm run build
pm2 restart pms
```

---

## Health Check

After deployment, verify:

1. ✅ App is running: `pm2 status`
2. ✅ No errors in logs: `pm2 logs pms --lines 50`
3. ✅ Website loads: Visit your domain
4. ✅ Login works
5. ✅ Database connected

---

## Support

If issues persist:
1. Check logs: `pm2 logs pms`
2. Check Nginx: `sudo systemctl status nginx`
3. Check database: `sudo systemctl status postgresql`
4. Check disk space: `df -h`
5. Check memory: `free -h`
