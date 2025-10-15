#!/usr/bin/env bash
# ============================================
# Database Setup Script
# ============================================
set -euo pipefail

# ⚠️ CONFIGURATION - EDIT THESE VALUES
DB_NAME="ckcm_payroll"
DB_USER="pms_user"
DB_PASS="YOUR_STRONG_PASSWORD_HERE"  # ⚠️ CHANGE THIS!
SQL_DUMP="/root/ckcm_payroll.sql"

echo "🗄️  Setting up MySQL database..."

# Create database and user
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "✅ Database '${DB_NAME}' created"
echo "✅ User '${DB_USER}' created with full privileges"

# Import database dump if exists
if [ -f "${SQL_DUMP}" ]; then
    echo "📥 Importing database dump..."
    mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "${SQL_DUMP}"
    echo "✅ Database imported successfully"
else
    echo "⚠️  SQL dump not found at ${SQL_DUMP}"
    echo "   You can import it manually later with:"
    echo "   mysql -u ${DB_USER} -p ${DB_NAME} < /path/to/dump.sql"
fi

echo ""
echo "📋 Database Configuration:"
echo "   Database: ${DB_NAME}"
echo "   Username: ${DB_USER}"
echo "   Password: ${DB_PASS}"
echo ""
echo "🔗 Connection String:"
echo "   DATABASE_URL=\"mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}\""
