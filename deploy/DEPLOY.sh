#!/usr/bin/env bash
# ============================================
# MASTER DEPLOYMENT SCRIPT
# Complete deployment automation for PMS
# ============================================
set -euo pipefail

# ============================================
# ⚠️  CONFIGURATION - EDIT BEFORE RUNNING
# ============================================
DB_NAME="ckcm_payroll"
DB_USER="pms_user"
DB_PASS="MyStrongDBPass123!"  # ⚠️ CHANGE THIS!
SERVER_IP="72.60.233.210"
DOMAIN="pmsckcm.com"  # Optional: your domain name
ENABLE_SSL="false"  # Set to "true" if you have a domain

APP_DIR="/var/www/pms"
ARCHIVE="/root/pms-deploy.tar.gz"
SQL_DUMP="/root/ckcm_payroll.sql"

# ============================================
# DEPLOYMENT PROCESS
# ============================================

echo "🚀 ============================================"
echo "   PMS Deployment Script v1.0"
echo "   CKCM Payroll Management System"
echo "============================================"
echo ""

# Step 1: System Provisioning
echo "📦 Step 1/7: Provisioning VPS..."
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git ufw build-essential nginx mysql-server

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Configure firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
yes | ufw enable || true

echo "✅ VPS provisioned successfully"
echo ""

# Step 2: Database Setup
echo "🗄️  Step 2/7: Setting up MySQL database..."
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

if [ -f "${SQL_DUMP}" ]; then
    mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "${SQL_DUMP}"
    echo "✅ Database imported successfully"
else
    echo "⚠️  SQL dump not found - you'll need to import manually"
fi
echo ""

# Step 3: Deploy Application
echo "📂 Step 3/7: Deploying application..."
mkdir -p "${APP_DIR}"
tar -xzf "${ARCHIVE}" -C "${APP_DIR}"
cd "${APP_DIR}"
npm ci --production=false
npx prisma generate
npm run build
echo "✅ Application built successfully"
echo ""

# Step 4: Configure Environment
echo "⚙️  Step 4/7: Configuring environment..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
cat > "${APP_DIR}/.env" <<ENV
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"
NEXTAUTH_URL="http://${SERVER_IP}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
NODE_ENV="production"
ENV
chmod 600 "${APP_DIR}/.env"
echo "✅ Environment configured"
echo ""

# Step 5: Setup Systemd Service
echo "🔧 Step 5/7: Creating systemd service..."
cat > /etc/systemd/system/pms.service <<SERVICE
[Unit]
Description=CKCM Payroll Management System
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/npm start -- --port 3000 --hostname 127.0.0.1
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable pms.service
systemctl start pms.service
echo "✅ Service started"
echo ""

# Step 6: Configure Nginx
echo "🌐 Step 6/7: Configuring Nginx..."
cat > /etc/nginx/sites-available/pms <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name _;
    client_max_body_size 20M;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    access_log /var/log/nginx/pms-access.log;
    error_log /var/log/nginx/pms-error.log;
}
NGINX

ln -sf /etc/nginx/sites-available/pms /etc/nginx/sites-enabled/pms
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "✅ Nginx configured"
echo ""

# Step 7: SSL Setup (Optional)
if [ "${ENABLE_SSL}" = "true" ] && [ -n "${DOMAIN}" ]; then
    echo "🔒 Step 7/7: Setting up SSL..."
    snap install --classic certbot
    certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos --email admin@${DOMAIN}
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"https://${DOMAIN}\"|g" "${APP_DIR}/.env"
    systemctl restart pms
    echo "✅ SSL configured"
else
    echo "⏭️  Step 7/7: Skipping SSL (not configured)"
fi
echo ""

# Deployment Complete
echo "🎉 ============================================"
echo "   DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "============================================"
echo ""
echo "📋 Configuration Summary:"
echo "   Database: ${DB_NAME}"
echo "   Database User: ${DB_USER}"
echo "   App Directory: ${APP_DIR}"
if [ "${ENABLE_SSL}" = "true" ]; then
    echo "   URL: https://${DOMAIN}"
else
    echo "   URL: http://${SERVER_IP}"
fi
echo ""
echo "🔑 Credentials:"
echo "   NextAuth Secret: ${NEXTAUTH_SECRET}"
echo "   DB Password: ${DB_PASS}"
echo ""
echo "📝 Useful Commands:"
echo "   Service status:  systemctl status pms"
echo "   Service logs:    journalctl -u pms -f"
echo "   Restart app:     systemctl restart pms"
echo "   Nginx logs:      tail -f /var/log/nginx/pms-error.log"
echo ""
echo "✅ Your PMS is now live!"
