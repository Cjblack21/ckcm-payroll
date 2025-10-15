#!/usr/bin/env bash
# ============================================
# Environment Configuration Helper
# ============================================
set -euo pipefail

APP_DIR="/var/www/pms"
ENV_FILE="${APP_DIR}/.env"

# ⚠️ CONFIGURATION - EDIT THESE VALUES BEFORE RUNNING
DB_USER="pms_user"
DB_PASS="YOUR_STRONG_PASSWORD_HERE"  # Must match database setup
DB_NAME="ckcm_payroll"
SERVER_IP="72.60.233.210"  # Or your domain name
NEXTAUTH_SECRET=""  # Generate with: openssl rand -base64 32

# Optional Google OAuth (leave empty if not using)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

echo "⚙️  Configuring environment variables..."

# Generate NEXTAUTH_SECRET if empty
if [ -z "${NEXTAUTH_SECRET}" ]; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo "🔑 Generated NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}"
fi

# Create .env file
cat > "${ENV_FILE}" <<ENV
# Production Environment Configuration
# Generated on $(date)

# Database Configuration
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"

# NextAuth Configuration
NEXTAUTH_URL="http://${SERVER_IP}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}"

# Node Environment
NODE_ENV="production"
ENV

# Secure the file
chmod 600 "${ENV_FILE}"

echo "✅ Environment file created: ${ENV_FILE}"
echo ""
echo "📋 Configuration Summary:"
echo "   Database: ${DB_NAME}"
echo "   Database User: ${DB_USER}"
echo "   App URL: http://${SERVER_IP}"
echo "   NextAuth Secret: ${NEXTAUTH_SECRET}"
echo ""
echo "⚠️  IMPORTANT: Keep your .env file secure!"
