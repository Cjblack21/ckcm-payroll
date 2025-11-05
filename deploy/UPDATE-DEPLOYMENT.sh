#!/usr/bin/env bash
# ============================================
# UPDATE DEPLOYMENT SCRIPT
# For updating existing PMS deployment
# ============================================
set -euo pipefail

# ============================================
# ⚠️  CONFIGURATION
# ============================================
DB_NAME="ckcm_payroll"
DB_USER="pms_user"
DB_PASS="MyStrongDBPass123!"  # ⚠️ Use the same password as initial deployment
SERVER_IP="72.60.233.210"
APP_DIR="/var/www/pms"

# ============================================
# UPDATE PROCESS
# ============================================

echo "🚀 ============================================"
echo "   PMS Update Deployment Script"
echo "   CKCM Payroll Management System"
echo "============================================"
echo ""

# Step 1: Backup Current System
echo "📦 Step 1/6: Creating backup..."
BACKUP_DIR="/root/pms-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

# Backup database
echo "  Backing up database..."
mysqldump -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" > "${BACKUP_DIR}/database-backup.sql"

# Backup .env file
echo "  Backing up .env file..."
cp "${APP_DIR}/.env" "${BACKUP_DIR}/.env.backup" 2>/dev/null || echo "  No .env to backup"

echo "✅ Backup created at ${BACKUP_DIR}"
echo ""

# Step 2: Extract and Deploy Updated Files
echo "📂 Step 2/6: Deploying updated files..."
cd "${APP_DIR}"

# Extract new files (this will overwrite existing files)
tar -xzf /root/pms-deploy.tar.gz -C "${APP_DIR}" --overwrite

echo "✅ Files updated"
echo ""

# Step 3: Install Dependencies
echo "📦 Step 3/6: Installing dependencies..."
npm ci --production=false
echo "✅ Dependencies installed"
echo ""

# Step 4: Update Database Schema (if schema changed)
echo "🗄️  Step 4/6: Updating database schema..."

# Regenerate Prisma Client
npx prisma generate

# Push schema changes (this will detect and apply schema changes)
echo "  Checking for schema changes..."
npx prisma db push

echo "✅ Database schema updated"
echo ""

# Step 5: Rebuild Application
echo "🏗️  Step 5/6: Rebuilding application..."
npm run build
echo "✅ Application rebuilt"
echo ""

# Step 6: Restart Service
echo "🔄 Step 6/6: Restarting service..."
systemctl restart pms
sleep 3

# Check service status
if systemctl is-active --quiet pms; then
    echo "✅ Service restarted successfully"
else
    echo "❌ Service failed to start! Check logs:"
    echo "   journalctl -u pms -n 50"
    exit 1
fi

echo ""

# Deployment Complete
echo "🎉 ============================================"
echo "   UPDATE DEPLOYMENT COMPLETED!"
echo "============================================"
echo ""
echo "📋 Summary:"
echo "   Backup Location: ${BACKUP_DIR}"
echo "   App Directory: ${APP_DIR}"
echo "   URL: http://${SERVER_IP}"
echo ""
echo "📝 Useful Commands:"
echo "   Service status:  systemctl status pms"
echo "   Service logs:    journalctl -u pms -f"
echo "   Nginx logs:      tail -f /var/log/nginx/pms-error.log"
echo ""
echo "   Restore backup:  mysql -u ${DB_USER} -p ${DB_NAME} < ${BACKUP_DIR}/database-backup.sql"
echo ""
echo "✅ Your PMS update is now live!"















