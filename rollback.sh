#!/bin/bash

# ============================================
# PMS Rollback Script
# Server: 72.60.233.210
# Path: /var/www/pms
# ============================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  Starting rollback to previous version...${NC}"
echo "=================================================="

# SSH into server and rollback
ssh root@72.60.233.210 << 'ENDSSH'
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📂 Navigating to project directory...${NC}"
cd /var/www/pms || { echo -e "${RED}❌ Failed to navigate${NC}"; exit 1; }

echo -e "${YELLOW}⏪ Rolling back to previous commit...${NC}"
git reset --hard HEAD~1 || { echo -e "${RED}❌ Rollback failed${NC}"; exit 1; }

echo -e "${BLUE}📚 Installing dependencies...${NC}"
npm install --legacy-peer-deps || { echo -e "${RED}❌ npm install failed${NC}"; exit 1; }

echo -e "${BLUE}🗄️ Generating Prisma Client...${NC}"
npx prisma generate || { echo -e "${RED}❌ Prisma generate failed${NC}"; exit 1; }

echo -e "${BLUE}🏗️ Building application...${NC}"
NODE_ENV=production npm run build || { echo -e "${RED}❌ Build failed${NC}"; exit 1; }

echo -e "${BLUE}♻️ Restarting application...${NC}"
pm2 restart pms || { echo -e "${RED}❌ Restart failed${NC}"; exit 1; }

echo -e "${GREEN}✅ Rollback complete!${NC}"
echo ""
echo -e "${BLUE}📊 PM2 Status:${NC}"
pm2 status

echo ""
echo -e "${BLUE}📝 Recent logs:${NC}"
pm2 logs pms --lines 20 --nostream

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=================================================="
    echo -e "✅ Rollback completed successfully!"
    echo -e "🔙 Application reverted to previous version"
    echo -e "==================================================${NC}"
else
    echo ""
    echo -e "${RED}=================================================="
    echo -e "❌ Rollback failed! Manual intervention required."
    echo -e "==================================================${NC}"
    exit 1
fi
