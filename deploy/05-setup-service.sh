#!/usr/bin/env bash
# ============================================
# Systemd Service Setup Script
# ============================================
set -euo pipefail

APP_DIR="/var/www/pms"
SERVICE_FILE="/etc/systemd/system/pms.service"

echo "🔧 Creating systemd service..."

# Create systemd service file
cat > "${SERVICE_FILE}" <<SERVICE
[Unit]
Description=CKCM Payroll Management System (Next.js)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/npm start -- --port 3000 --hostname 127.0.0.1
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=pms

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SERVICE

echo "✅ Service file created: ${SERVICE_FILE}"

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable pms.service

echo "✅ Service enabled"
echo ""
echo "📋 Service Management Commands:"
echo "   Start:   systemctl start pms"
echo "   Stop:    systemctl stop pms"
echo "   Restart: systemctl restart pms"
echo "   Status:  systemctl status pms"
echo "   Logs:    journalctl -u pms -f"
