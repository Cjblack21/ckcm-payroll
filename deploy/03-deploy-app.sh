#!/usr/bin/env bash
# ============================================
# Application Deployment Script
# ============================================
set -euo pipefail

# Configuration
APP_DIR="/var/www/pms"
ARCHIVE="/root/pms-deploy.tar.gz"
APP_PORT=3000

echo "📦 Deploying Next.js application..."

# Create application directory
mkdir -p "${APP_DIR}"

# Extract archive
if [ -f "${ARCHIVE}" ]; then
    echo "📂 Extracting application files..."
    tar -xzf "${ARCHIVE}" -C "${APP_DIR}"
    echo "✅ Files extracted to ${APP_DIR}"
else
    echo "❌ Archive not found: ${ARCHIVE}"
    exit 1
fi

# Navigate to app directory
cd "${APP_DIR}"

# Install dependencies
echo "📥 Installing dependencies..."
npm ci --production=false

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Build application
echo "🏗️  Building Next.js application..."
npm run build

echo ""
echo "✅ Application deployed to ${APP_DIR}"
echo "📝 Next steps:"
echo "   1. Create .env file with production variables"
echo "   2. Set up systemd service"
echo "   3. Configure Nginx reverse proxy"
