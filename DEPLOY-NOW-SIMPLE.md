# 🚀 DEPLOY NOW - SIMPLE VERSION

## ⚡ One-Command Deploy

### For Windows PowerShell:
```powershell
cd "D:\pms (test 1)"
powershell -ExecutionPolicy Bypass -File .\deploy-windows.ps1
```

### For Git Bash:
```bash
cd "D:\pms (test 1)"
bash DEPLOY-ERROR-FREE.sh
```

---

## 📋 What This Does:

1. ✅ Tests your code builds locally
2. ✅ Commits and pushes to Git
3. ✅ Connects to VPS (72.60.233.210)
4. ✅ Pulls latest code
5. ✅ Installs dependencies
6. ✅ Builds the app
7. ✅ Restarts the server
8. ✅ Shows you the status

---

## 🎯 After Deployment:

Visit: **https://payrollmanagement.space**

Test:
- ✅ Login works
- ✅ Dashboard loads
- ✅ Payroll features work
- ✅ No errors in console

---

## 🔧 If Something Goes Wrong:

### Quick Fix Commands:
```bash
# Connect to VPS
ssh root@72.60.233.210

# Check status
pm2 status
pm2 logs pms --lines 50

# Restart if needed
pm2 restart pms

# Check logs
pm2 logs pms
```

### Emergency Rollback:
```bash
bash rollback.sh
```

---

## 📞 Common Issues:

### "Build failed locally"
- Fix the errors shown in the terminal
- Run `npm run build` again
- Don't deploy until it succeeds

### "Git push failed"
- Check your internet connection
- Make sure you have Git credentials set up
- Try: `git push origin main` manually

### "SSH connection failed"
- Check VPS is online
- Verify SSH key or password
- Try: `ssh root@72.60.233.210` manually

### "App won't start on VPS"
```bash
ssh root@72.60.233.210
cd /var/www/pms
pm2 logs pms --lines 100
# Fix the error shown, then:
pm2 restart pms
```

---

## ✅ Success Checklist:

After deployment, verify:

- [ ] Script completed without errors
- [ ] Website loads: https://payrollmanagement.space
- [ ] Can login with credentials
- [ ] Dashboard shows data
- [ ] No console errors in browser
- [ ] PM2 shows app as "online"

---

## 🎉 That's It!

Your app should now be live and running.

**Need help?** Check `DEPLOY-GUIDE-FINAL.md` for detailed troubleshooting.
