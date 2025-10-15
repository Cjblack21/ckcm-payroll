#!/usr/bin/env bash
# ============================================
# SSL Certificate Setup (Let's Encrypt)
# ============================================
set -euo pipefail

DOMAIN="pmsckcm.com"  # Change to your domain

echo "🔒 Setting up SSL certificate..."

# Install Certbot
snap install --classic certbot

# Request certificate
certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos --email admin@${DOMAIN}

# Update NEXTAUTH_URL in .env
sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"https://${DOMAIN}\"|g" /var/www/pms/.env

# Restart application
systemctl restart pms

echo ""
echo "✅ SSL certificate installed!"
echo "🔒 Your site is now accessible via HTTPS:"
echo "   https://${DOMAIN}"
echo ""
echo "📝 Certificate auto-renewal is configured"
echo "   Test renewal: certbot renew --dry-run"
