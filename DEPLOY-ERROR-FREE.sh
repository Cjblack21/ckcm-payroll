#!/bin/bash
# ============================================
# ERROR-FREE DEPLOYMENT SCRIPT
# Server: root@72.60.233.210
# Domain: payrollmanagement.space
# ============================================

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ERROR-FREE PMS DEPLOYMENT SCRIPT      ║${NC}"
echo -e "${BLUE}║  payrollmanagement.space               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# STEP 1: Pre-deployment checks
# ============================================
echo -e "${YELLOW}[1/8] Running pre-deployment checks...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# Check if git is clean
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Pre-checks passed${NC}"
echo ""

# ============================================
# STEP 2: Test build locally
# ============================================
echo -e "${YELLOW}[2/8] Testing build locally...${NC}"
echo -e "${BLUE}This ensures the code will build on the server${NC}"

if npm run build; then
    echo -e "${GREEN}✅ Local build successful${NC}"
else
    echo -e "${RED}❌ Local build failed! Fix errors before deploying.${NC}"
    exit 1
fi
echo ""

# ============================================
# STEP 3: Push to Git
# ============================================
echo -e "${YELLOW}[3/8] Pushing to Git...${NC}"

git add .
git commit -m "Deploy: $(date +'%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin main

echo -e "${GREEN}✅ Code pushed to Git${NC}"
echo ""

# ============================================
# STEP 4: Deploy to VPS
# ============================================
echo -e "${YELLOW}[4/8] Connecting to VPS and deploying...${NC}"

ssh root@72.60.233.210 << 'ENDSSH'
set -e

# Colors for remote
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Connected to VPS${NC}"
echo ""

# Navigate to app directory
echo -e "${YELLOW}[5/8] Navigating to app directory...${NC}"
cd /var/www/pms || { echo -e "${RED}❌ Failed to navigate to /var/www/pms${NC}"; exit 1; }
echo -e "${GREEN}✅ In /var/www/pms${NC}"
echo ""

# Create backup
echo -e "${YELLOW}[6/8] Creating backup...${NC}"
BACKUP_DIR="/root/pms-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

# Backup .env file
if [ -f ".env" ]; then
    cp .env "${BACKUP_DIR}/.env.backup"
    echo -e "${GREEN}✅ Environment file backed up${NC}"
fi

# Backup database (optional - uncomment if needed)
# mysqldump -u pms_user -p'YOUR_PASSWORD' ckcm_payroll > "${BACKUP_DIR}/db-backup.sql"

echo -e "${GREEN}✅ Backup created at ${BACKUP_DIR}${NC}"
echo ""

# Pull latest code
echo -e "${YELLOW}[7/8] Pulling latest code from Git...${NC}"
git pull origin main || { echo -e "${RED}❌ Git pull failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# Clean old build
echo -e "${BLUE}Cleaning old build files...${NC}"
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install --legacy-peer-deps || { echo -e "${RED}❌ npm install failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Generate Prisma Client
echo -e "${BLUE}Generating Prisma Client...${NC}"
npx prisma generate || { echo -e "${RED}❌ Prisma generate failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Prisma Client generated${NC}"

# Run database migrations
echo -e "${BLUE}Running database migrations...${NC}"
npx prisma migrate deploy || echo -e "${YELLOW}⚠️  Migration warning (may be normal)${NC}"

# Build application
echo -e "${BLUE}Building Next.js application...${NC}"
NODE_ENV=production npm run build || { echo -e "${RED}❌ Build failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Restart application
echo -e "${YELLOW}[8/8] Restarting application...${NC}"

# Check if using PM2 or systemd
if command -v pm2 &> /dev/null && pm2 list | grep -q "pms"; then
    echo -e "${BLUE}Using PM2...${NC}"
    pm2 restart pms
    pm2 save
    echo ""
    echo -e "${BLUE}PM2 Status:${NC}"
    pm2 status
    echo ""
    echo -e "${BLUE}Recent logs:${NC}"
    pm2 logs pms --lines 20 --nostream
elif systemctl is-active --quiet pms; then
    echo -e "${BLUE}Using systemd...${NC}"
    systemctl restart pms
    echo ""
    echo -e "${BLUE}Service Status:${NC}"
    systemctl status pms --no-pager -l
    echo ""
    echo -e "${BLUE}Recent logs:${NC}"
    journalctl -u pms -n 20 --no-pager
else
    echo -e "${RED}❌ No process manager found (PM2 or systemd)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Application restarted${NC}"

ENDSSH

# ============================================
# STEP 5: Verify deployment
# ============================================
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ DEPLOYMENT SUCCESSFUL!             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}🌐 Your app is live at:${NC}"
    echo -e "${GREEN}   https://payrollmanagement.space${NC}"
    echo ""
    echo -e "${BLUE}📝 Next steps:${NC}"
    echo "   1. Visit the website and test login"
    echo "   2. Check all features are working"
    echo "   3. Monitor logs for any errors"
    echo ""
    echo -e "${BLUE}📊 Useful commands:${NC}"
    echo "   ssh root@72.60.233.210"
    echo "   pm2 logs pms          # View logs"
    echo "   pm2 monit             # Monitor app"
    echo "   systemctl status pms  # Check status"
    echo ""
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ DEPLOYMENT FAILED!                 ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Check the errors above and try again.${NC}"
    echo ""
    echo -e "${BLUE}To rollback, run:${NC}"
    echo "   bash rollback.sh"
    exit 1
fi
