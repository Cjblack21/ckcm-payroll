# ⚡ Quick Deploy Reference Card
## One-Page Deployment Guide for Hostinger VPS

---

## 🚀 FASTEST METHOD (3 Commands)

```bash
# 1. Commit your changes
git add . && git commit -m "Update" && git push origin main

# 2. Deploy
bash DEPLOY-UPDATE.sh

# 3. Verify
# Visit http://72.60.233.210
```

**Done! ✅**

---

## 📋 Pre-Flight Check (30 seconds)

```bash
# Make sure these pass:
npm run build          # ✅ Build succeeds locally
git status            # ✅ All changes committed
git push origin main  # ✅ Pushed to GitHub
```

---

## 🔧 Manual Deploy (If Script Fails)

```bash
# SSH to server
ssh root@72.60.233.210

# Update code
cd /var/www/pms
git pull origin main

# Clean and rebuild
rm -rf .next node_modules/.cache
npm install --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
NODE_ENV=production npm run build

# Restart
pm2 restart pms
pm2 logs pms --lines 50
```

---

## 🆘 Emergency Commands

### Check Status
```bash
ssh root@72.60.233.210 'pm2 status'
```

### View Logs
```bash
ssh root@72.60.233.210 'pm2 logs pms --lines 100'
```

### Restart App
```bash
ssh root@72.60.233.210 'pm2 restart pms'
```

### Rollback
```bash
bash rollback.sh
```

---

## ✅ Verify Deployment

1. **Check PM2**: `pm2 status` → Should be `online`
2. **Check Logs**: `pm2 logs pms` → No errors
3. **Test Website**: Visit `http://72.60.233.210`
4. **Test Login**: Use your credentials
5. **Test Features**: Check payroll, attendance, etc.

---

## 🐛 Quick Fixes

### Build Failed
```bash
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run build
pm2 restart pms
```

### Database Error
```bash
npx prisma generate
npx prisma migrate deploy
pm2 restart pms
```

### Port Conflict
```bash
lsof -i :3000
kill -9 <PID>
pm2 restart pms
```

### Out of Memory
```bash
pm2 delete pms
pm2 start npm --name "pms" --max-memory-restart 1G -- start
pm2 save
```

---

## 📊 Server Info

- **IP**: 72.60.233.210
- **Path**: /var/www/pms
- **Process**: pms (PM2)
- **Port**: 3000
- **Database**: ckcm_payroll (MySQL)

---

## 🔄 Deployment Flow

```
Local Changes → Git Push → SSH to VPS → Pull Code → 
Build App → Restart PM2 → Verify → Done ✅
```

---

## 💡 Pro Tips

1. **Always backup**: Script does this automatically
2. **Test locally first**: `npm run build` before deploying
3. **Monitor after deploy**: Watch logs for 5 minutes
4. **Keep backups**: Located at `/root/pms-backups/`
5. **Document changes**: Good commit messages help debugging

---

## 📞 Quick Support

**Can't connect?**
```bash
ping 72.60.233.210
ssh -v root@72.60.233.210
```

**App won't start?**
```bash
pm2 logs pms --lines 200
journalctl -u pms -n 100
```

**Database issues?**
```bash
mysql -u pms_user -p ckcm_payroll
SHOW TABLES;
```

---

## ⏱️ Expected Times

- **Automated Deploy**: 3-5 minutes
- **Manual Deploy**: 5-10 minutes
- **Rollback**: 2-3 minutes
- **Verification**: 2 minutes

---

## 🎯 Success Checklist

- [ ] PM2 status: online
- [ ] No errors in logs
- [ ] Website loads
- [ ] Login works
- [ ] Features operational
- [ ] No memory leaks

---

**Keep this card handy for quick deployments! 🚀**
