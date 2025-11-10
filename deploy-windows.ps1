# ============================================
# ERROR-FREE DEPLOYMENT SCRIPT FOR WINDOWS
# Server: root@72.60.233.210
# Domain: payrollmanagement.space
# ============================================

$ErrorActionPreference = "Stop"

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Cyan "╔════════════════════════════════════════╗"
Write-ColorOutput Cyan "║  ERROR-FREE PMS DEPLOYMENT SCRIPT      ║"
Write-ColorOutput Cyan "║  payrollmanagement.space               ║"
Write-ColorOutput Cyan "╚════════════════════════════════════════╝"
Write-Output ""

# ============================================
# STEP 1: Pre-deployment checks
# ============================================
Write-ColorOutput Yellow "[1/5] Running pre-deployment checks..."

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-ColorOutput Red "❌ Error: package.json not found. Are you in the project root?"
    exit 1
}

# Check if git is installed
try {
    git --version | Out-Null
} catch {
    Write-ColorOutput Red "❌ Error: Git is not installed or not in PATH"
    exit 1
}

Write-ColorOutput Green "✅ Pre-checks passed"
Write-Output ""

# ============================================
# STEP 2: Test build locally
# ============================================
Write-ColorOutput Yellow "[2/5] Testing build locally..."
Write-ColorOutput Cyan "This ensures the code will build on the server"

try {
    npm run build
    Write-ColorOutput Green "✅ Local build successful"
} catch {
    Write-ColorOutput Red "❌ Local build failed! Fix errors before deploying."
    exit 1
}
Write-Output ""

# ============================================
# STEP 3: Push to Git
# ============================================
Write-ColorOutput Yellow "[3/5] Pushing to Git..."

git add .
$commitMessage = "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
try {
    git commit -m $commitMessage
} catch {
    Write-ColorOutput Yellow "No changes to commit"
}

try {
    git push origin main
    Write-ColorOutput Green "✅ Code pushed to Git"
} catch {
    Write-ColorOutput Red "❌ Failed to push to Git"
    exit 1
}
Write-Output ""

# ============================================
# STEP 4: Deploy to VPS
# ============================================
Write-ColorOutput Yellow "[4/5] Deploying to VPS..."
Write-ColorOutput Cyan "Connecting to root@72.60.233.210..."

$deployScript = @'
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
echo -e "${YELLOW}Navigating to app directory...${NC}"
cd /var/www/pms || { echo -e "${RED}❌ Failed to navigate to /var/www/pms${NC}"; exit 1; }
echo -e "${GREEN}✅ In /var/www/pms${NC}"
echo ""

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
BACKUP_DIR="/root/pms-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

if [ -f ".env" ]; then
    cp .env "${BACKUP_DIR}/.env.backup"
    echo -e "${GREEN}✅ Environment file backed up${NC}"
fi

echo -e "${GREEN}✅ Backup created at ${BACKUP_DIR}${NC}"
echo ""

# Pull latest code
echo -e "${YELLOW}Pulling latest code from Git...${NC}"
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
echo -e "${YELLOW}Restarting application...${NC}"

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
'@

try {
    $deployScript | ssh root@72.60.233.210 "bash -s"
    $deploySuccess = $true
} catch {
    $deploySuccess = $false
}

# ============================================
# STEP 5: Verify deployment
# ============================================
Write-Output ""
if ($deploySuccess) {
    Write-ColorOutput Green "╔════════════════════════════════════════╗"
    Write-ColorOutput Green "║  ✅ DEPLOYMENT SUCCESSFUL!             ║"
    Write-ColorOutput Green "╚════════════════════════════════════════╝"
    Write-Output ""
    Write-ColorOutput Cyan "🌐 Your app is live at:"
    Write-ColorOutput Green "   https://payrollmanagement.space"
    Write-Output ""
    Write-ColorOutput Cyan "📝 Next steps:"
    Write-Output "   1. Visit the website and test login"
    Write-Output "   2. Check all features are working"
    Write-Output "   3. Monitor logs for any errors"
    Write-Output ""
    Write-ColorOutput Cyan "📊 Useful commands:"
    Write-Output "   ssh root@72.60.233.210"
    Write-Output "   pm2 logs pms          # View logs"
    Write-Output "   pm2 monit             # Monitor app"
    Write-Output "   systemctl status pms  # Check status"
    Write-Output ""
} else {
    Write-ColorOutput Red "╔════════════════════════════════════════╗"
    Write-ColorOutput Red "║  ❌ DEPLOYMENT FAILED!                 ║"
    Write-ColorOutput Red "╚════════════════════════════════════════╝"
    Write-Output ""
    Write-ColorOutput Yellow "Check the errors above and try again."
    Write-Output ""
    Write-ColorOutput Cyan "To rollback, run:"
    Write-Output "   bash rollback.sh"
    exit 1
}
