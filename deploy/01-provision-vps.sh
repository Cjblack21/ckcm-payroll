#!/usr/bin/env bash
# ============================================
# VPS Provisioning Script for Next.js PMS
# ============================================
set -euo pipefail

echo "🚀 Starting VPS provisioning..."

# Update system
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# Install essential tools
apt-get install -y curl wget git ufw build-essential

# Install Nginx
apt-get install -y nginx

# Install MySQL Server
apt-get install -y mysql-server

# Secure MySQL (basic hardening)
mysql -e "DELETE FROM mysql.user WHERE User='';"
mysql -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
mysql -e "DROP DATABASE IF EXISTS test;"
mysql -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
mysql -e "FLUSH PRIVILEGES;"

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify installations
echo ""
echo "✅ Installation Summary:"
nginx -v
mysql --version
node --version
npm --version

# Configure Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
yes | ufw enable || true

echo ""
echo "✅ VPS provisioning completed!"
echo "📦 Installed: Nginx, MySQL, Node.js 20, UFW"
