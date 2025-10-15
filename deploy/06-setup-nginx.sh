#!/usr/bin/env bash
# ============================================
# Nginx Reverse Proxy Setup
# ============================================
set -euo pipefail

DOMAIN="pmsckcm.com"  # Change this to your domain or use IP
NGINX_CONF="/etc/nginx/sites-available/pms"

echo "🌐 Configuring Nginx reverse proxy..."

# Create Nginx configuration
cat > "${NGINX_CONF}" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    
    server_name pmsckcm.com www.pmsckcm.com;  # Update with your domain
    
    client_max_body_size 20M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
    
    # Logs
    access_log /var/log/nginx/pms-access.log;
    error_log /var/log/nginx/pms-error.log;
}
NGINX

echo "✅ Nginx config created: ${NGINX_CONF}"

# Enable site
ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/pms

# Remove default site if exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
    echo "✅ Removed default site"
fi

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx

echo ""
echo "✅ Nginx configured successfully!"
echo "📋 Your application is now accessible at:"
echo "   http://${DOMAIN}"
echo "   http://72.60.233.210"
echo ""
echo "📝 To enable SSL (HTTPS), run:"
echo "   snap install --classic certbot"
echo "   certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
