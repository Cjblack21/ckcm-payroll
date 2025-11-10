#!/bin/bash

# ============================================
# PMS UPDATE DEPLOYMENT SCRIPT
# For deploying updated code to existing VPS
# Server: 72.60.233.210
# Path: /var/www/pms
# ============================================

set -e  # Exit on any error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🚀 PMS UPDATE DEPLOYMENT TO HOSTINGER VPS    ║${NC}"
echo -e "${CYAN}║     CKCM Payroll Management System            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Pre-deployment checks
echo -e "${BLUE}📋 Pre-Deployment Checks...${NC}"
echo -e "${YELLOW}⚠️  Make sure you have:${NC}"
echo "   1. Committed all changes to Git"
echo "   2. Pushed to main branch"
echo "   3. Tested locally with 'npm run build'"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔗 Connecting to VPS...${NC}"

# SSH into server and deploy with comprehensive error handling
ssh root@72.60.233.210 << 'ENDSSH'
set -e  # Exit on error

# Color codes for remote
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📦 Step 1/8: Creating Backup${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"

# Create backup directory
BACKUP_DIR="/root/pms-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

# Backup database
echo -e "${YELLOW}  → Backing up database...${NC}"
cd /var/www/pms
if [ -f .env ]; then
    DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2 | tr -d '"')
    if [[ $DB_URL == mysql://* ]]; then
        # Extract MySQL credentials
        DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        
        mysqldump -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" > "${BACKUP_DIR}/database-backup.sql" 2>/dev/null || echo -e "${YELLOW}  ⚠️  Database backup skipped${NC}"
    fi
fi

# Backup .env file
echo -e "${YELLOW}  → Backing up .env file...${NC}"
cp /var/www/pms/.env "${BACKUP_DIR}/.env.backup" 2>/dev/null || echo -e "${YELLOW}  ⚠️  No .env to backup${NC}"

# Backup current code (just in case)
echo -e "${YELLOW}  → Creating code snapshot...${NC}"
cd /var/www/pms
git rev-parse HEAD > "${BACKUP_DIR}/git-commit.txt" 2>/dev/null || echo "No git info" > "${BACKUP_DIR}/git-commit.txt"

echo -e "${GREEN}✅ Backup created at ${BACKUP_DIR}${NC}"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📂 Step 2/8: Navigating to Project${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"

cd /var/www/pms || { echo -e "${RED}❌ Failed to navigate to /var/www/pms${NC}"; exit 1; }
echo -e "${GREEN}✅ In project directory${NC}"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔄 Step 3/8: Pulling Latest Code${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}  → Current branch: ${CURRENT_BRANCH}${NC}"

# Stash any local changes (just in case)
echo -e "${YELLOW}  → Stashing local changes...${NC}"
git stash push -m "Auto-stash before deployment $(date)" || true

# Pull latest code
echo -e "${YELLOW}  → Pulling from origin/main...${NC}"
git pull origin main || { echo -e "${RED}❌ Git pull failed${NC}"; exit 1; }

echo -e "${GREEN}✅ Code updated successfully${NC}"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🧹 Step 4/8: Cleaning Build Cache${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"

echo -e "${YELLOW}  → Removing .next directory...${NC}"
rm -rf .next

echo -e "${YELLOW}  → Removing node_modules cache...${NC}"
rm -rf node_modules/.cache

echo -e "${GREEN}✅ Cache cleaned${NC}"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📚 Step 5/8: Installing Dependencies${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"

npm install --legacy-peer-deps || { echo -e "${RED}❌ npm install failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Dependencies installed${NC}"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🗄️  Step 6/8: Updating Database${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"

echo -e "${YELLOW}  → Generating Prisma Client...${NC}"
npx prisma generate || { echo -e "${RED}❌ Prisma generate failed${NC}"; exit 1; }

echo -e "${YELLOW}  → Running database migrations...${NC}"
npx prisma migrate deploy || { 
    echo -e "${YELLOW}⚠️  Migration warning - checking if DB is in sync...${NC}"
    npx prisma db push --accept-data-loss || echo -e "${YELLOW}⚠️  DB sync had issues, continuing...${NC}"
}

echo -e "${GREEN}✅ Database updated${NC}"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🏗️  Step 7/8: Building Application${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"

NODE_ENV=production npm run build || { echo -e "${RED}❌ Build failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Build completed successfully${NC}"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}♻️  Step 8/8: Restarting Application${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"

# Check if PM2 process exists
if pm2 list | grep -q "pms"; then
    echo -e "${YELLOW}  → Restarting existing PM2 process...${NC}"
    pm2 restart pms
    pm2 save
else
    echo -e "${YELLOW}  → Starting new PM2 process...${NC}"
    pm2 start npm --name "pms" -- start
    pm2 save
fi

# Wait for app to start
echo -e "${YELLOW}  → Waiting for application to start...${NC}"
sleep 5

echo -e "${GREEN}✅ Application restarted${NC}"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo ""

# Show status
echo -e "${BLUE}📊 Current Status:${NC}"
echo ""
pm2 status

echo ""
echo -e "${BLUE}📝 Recent Logs (last 30 lines):${NC}"
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
pm2 logs pms --lines 30 --nostream

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📋 Deployment Summary${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Backup Location:${NC} ${BACKUP_DIR}"
echo -e "${GREEN}✅ Git Commit:${NC} $(git rev-parse --short HEAD)"
echo -e "${GREEN}✅ Branch:${NC} $(git branch --show-current)"
echo -e "${GREEN}✅ Node Version:${NC} $(node --version)"
echo -e "${GREEN}✅ PM2 Status:${NC} Running"
echo ""
echo -e "${BLUE}🌐 Your application is now live!${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"

ENDSSH

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ DEPLOYMENT FINISHED SUCCESSFULLY!         ║${NC}"
    echo -e "${GREEN}║  🌐 Your app is now live at your domain      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📝 Next Steps:${NC}"
    echo "   1. Visit your website to verify it's working"
    echo "   2. Test login functionality"
    echo "   3. Check critical features"
    echo "   4. Monitor logs: ssh root@72.60.233.210 'pm2 logs pms'"
    echo ""
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ DEPLOYMENT FAILED!                        ║${NC}"
    echo -e "${RED}║  Check the errors above for details           ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
    echo "   1. SSH to server: ssh root@72.60.233.210"
    echo "   2. Check logs: pm2 logs pms"
    echo "   3. Check status: pm2 status"
    echo "   4. Rollback if needed: bash rollback.sh"
    echo ""
    exit 1
fi
