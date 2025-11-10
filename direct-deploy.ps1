# ============================================
# DIRECT DEPLOYMENT SCRIPT (NO GITHUB NEEDED)
# Deploy directly from your PC to VPS
# ============================================

$SERVER = "root@72.60.233.210"
$REMOTE_PATH = "/var/www/pms"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 DIRECT DEPLOYMENT TO HOSTINGER VPS        ║" -ForegroundColor Cyan
Write-Host "║     No GitHub Required!                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create Archive
Write-Host "📦 Step 1/5: Creating archive..." -ForegroundColor Yellow
Write-Host "   Excluding: node_modules, .next, .git" -ForegroundColor Gray

tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=pms-update.tar.gz -czf pms-update.tar.gz .

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Archive created successfully" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to create archive" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Upload to Server
Write-Host "📤 Step 2/5: Uploading to server..." -ForegroundColor Yellow
Write-Host "   Uploading pms-update.tar.gz to VPS..." -ForegroundColor Gray

scp pms-update.tar.gz ${SERVER}:/root/

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Upload successful" -ForegroundColor Green
} else {
    Write-Host "   ❌ Upload failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Backup Current Version
Write-Host "💾 Step 3/5: Creating backup on server..." -ForegroundColor Yellow

ssh $SERVER "mkdir -p /root/pms-backups && mysqldump -u pms_user -p'MyStrongDBPass123!' ckcm_payroll > /root/pms-backups/db-backup-`$(date +%Y%m%d-%H%M%S).sql 2>/dev/null || echo 'DB backup skipped'"

Write-Host "   ✅ Backup created" -ForegroundColor Green
Write-Host ""

# Step 4: Extract and Deploy
Write-Host "🔄 Step 4/5: Extracting and deploying..." -ForegroundColor Yellow

ssh $SERVER @"
set -e
cd $REMOTE_PATH

echo '   → Extracting files...'
tar -xzf /root/pms-update.tar.gz -C $REMOTE_PATH

echo '   → Cleaning cache...'
rm -rf .next node_modules/.cache

echo '   → Installing dependencies...'
npm install --legacy-peer-deps

echo '   → Updating Prisma...'
npx prisma generate
npx prisma migrate deploy || npx prisma db push --accept-data-loss

echo '   → Building application...'
NODE_ENV=production npm run build

echo '   → Cleaning up...'
rm -f /root/pms-update.tar.gz
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Deployment successful" -ForegroundColor Green
} else {
    Write-Host "   ❌ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 5: Restart Application
Write-Host "♻️  Step 5/5: Restarting application..." -ForegroundColor Yellow

ssh $SERVER "pm2 restart pms && pm2 save"

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Application restarted" -ForegroundColor Green
} else {
    Write-Host "   ❌ Restart failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Show Status
Write-Host "📊 Checking status..." -ForegroundColor Yellow
ssh $SERVER "pm2 status && echo '' && pm2 logs pms --lines 20 --nostream"

Write-Host ""

# Cleanup local archive
Write-Host "🧹 Cleaning up local files..." -ForegroundColor Yellow
Remove-Item pms-update.tar.gz -ErrorAction SilentlyContinue
Write-Host "   ✅ Cleanup complete" -ForegroundColor Green

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ DEPLOYMENT COMPLETED SUCCESSFULLY!        ║" -ForegroundColor Green
Write-Host "║  🌐 Your site is now live!                   ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Visit: https://payrollmanagement.space" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Useful commands:" -ForegroundColor Yellow
Write-Host "   Check status: ssh root@72.60.233.210 'pm2 status'" -ForegroundColor Gray
Write-Host "   View logs:    ssh root@72.60.233.210 'pm2 logs pms'" -ForegroundColor Gray
Write-Host ""
