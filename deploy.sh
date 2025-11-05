#!/bin/bash

# Deployment script for PMS on Hostinger VPS
# Server: 72.60.233.210
# Path: /var/www/pms

echo "🚀 Starting deployment to Hostinger VPS..."

# SSH into server and deploy
ssh root@72.60.233.210 << 'ENDSSH'
cd /var/www/pms

echo "📦 Pulling latest code from Git..."
git pull origin main

echo "📚 Installing dependencies..."
npm install

echo "🗄️ Running database migrations..."
npx prisma generate
npx prisma migrate deploy

echo "🏗️ Building Next.js application..."
npm run build

echo "♻️ Restarting PM2 service..."
pm2 restart pms || pm2 start npm --name "pms" -- start

echo "✅ Deployment complete!"
pm2 status
ENDSSH

echo "🎉 Deployment finished successfully!"
