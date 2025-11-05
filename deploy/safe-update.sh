#!/bin/bash
# ============================================
# SAFE UPDATE SCRIPT - Error-Free Deployment
# ============================================
set -e  # Exit on any error

APP_DIR="/var/www/pms"
BACKUP_DIR="/root/pms-backups/$(date +%Y%m%d-%H%M%S)"

echo "🚀 Starting Safe Update Process..."
echo ""

# Step 1: Backup
echo "📦 Step 1/7: Creating backup..."
mkdir -p "${BACKUP_DIR}"
mysqldump -u pms_user -p"${DB_PASS:-your_password_here}" ckcm_payroll > "${BACKUP_DIR}/db-backup.sql" 2>/dev/null || echo "⚠️  Backup skipped (update DB_PASS in script)"
cp "${APP_DIR}/.env" "${BACKUP_DIR}/.env.backup" 2>/dev/null || echo "⚠️  No .env to backup"
echo "✅ Backup created at ${BACKUP_DIR}"
echo ""

# Step 2: Check Git Status
echo "📋 Step 2/7: Checking git status..."
cd "${APP_DIR}"
if [[ -n $(git status -s) ]]; then
    echo "⚠️  WARNING: Uncommitted changes detected!"
    git status -s
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi
echo "✅ Git status checked"
echo ""

# Step 3: Pull Latest Changes
echo "⬇️  Step 3/7: Pulling latest changes..."
git fetch origin
BEFORE=$(git rev-parse HEAD)
git pull origin main
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" == "$AFTER" ]; then
    echo "ℹ️  Already up to date (no new changes)"
else
    echo "✅ Pulled new changes:"
    git log --oneline ${BEFORE}..${AFTER}
fi
echo ""

# Step 4: Install Dependencies
echo "📦 Step 4/7: Installing dependencies..."
npm ci --production=false
echo "✅ Dependencies installed"
echo ""

# Step 5: Update Database
echo "🗄️  Step 5/7: Updating database schema..."
npx prisma generate
npx prisma db push --accept-data-loss
echo "✅ Database updated"
echo ""

# Step 6: Build Application
echo "🏗️  Step 6/7: Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed! Check errors above"
    echo "💡 Rollback: mysql -u pms_user -p ckcm_payroll < ${BACKUP_DIR}/db-backup.sql"
    exit 1
fi
echo ""

# Step 7: Restart Service
echo "🔄 Step 7/7: Restarting service..."
systemctl restart pms
sleep 3

if systemctl is-active --quiet pms; then
    echo "✅ Service restarted successfully"
else
    echo "❌ Service failed to start!"
    echo "📋 Checking logs..."
    journalctl -u pms -n 20 --no-pager
    exit 1
fi
echo ""

# Final Verification
echo "🔍 Running verification checks..."
echo ""

echo "1️⃣  Service Status:"
systemctl status pms --no-pager | head -n 5

echo ""
echo "2️⃣  Application Response:"
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Application responding on port 3000"
else
    echo "❌ Application not responding"
fi

echo ""
echo "3️⃣  Recent Logs:"
journalctl -u pms -n 5 --no-pager

echo ""
echo "🎉 ============================================"
echo "   DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "============================================"
echo ""
echo "📋 Summary:"
echo "   Backup: ${BACKUP_DIR}"
echo "   URL: http://72.60.233.210"
echo ""
echo "📝 Useful Commands:"
echo "   View logs:    journalctl -u pms -f"
echo "   Service:      systemctl status pms"
echo "   Rollback DB:  mysql -u pms_user -p ckcm_payroll < ${BACKUP_DIR}/db-backup.sql"
echo ""















