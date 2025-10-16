# Deployment Fix: NextAuth Session Error (ERR_INTERNET_DISCONNECTED)

## Problem
The deployed system shows these errors:
```
Failed to load resource: net::ERR_INTERNET_DISCONNECTED
api/auth/session:1  Failed to load resource: net::ERR_INTERNET_DISCONNECTED
[next-auth][error][CLIENT_FETCH_ERROR] Failed to fetch
```

## Root Cause
The `NEXTAUTH_URL` environment variable was missing the protocol (`https://`).

### Incorrect Configuration:
```env
NEXTAUTH_URL="payrollmanagement.space"
```

### Correct Configuration:
```env
NEXTAUTH_URL="https://payrollmanagement.space"
```

## Why This Happens
NextAuth.js requires a **fully qualified URL** including the protocol. When the protocol is missing:
- NextAuth tries to connect to `payrollmanagement.space/api/auth/session` (invalid URL)
- The browser interprets this as a malformed request
- Results in `ERR_INTERNET_DISCONNECTED` or `Failed to fetch` errors
- All authentication and session management breaks

## Fix for Production Deployment

### Step 1: Update Environment Variables on Server

SSH into your production server and update the `.env` file:

```bash
# Navigate to your app directory
cd /path/to/your/app

# Edit the .env file
nano .env
```

Update this line:
```env
NEXTAUTH_URL="https://payrollmanagement.space"
```

**Important Notes:**
- Use `https://` if your site has SSL/TLS (recommended)
- Use `http://` only for local development or non-SSL deployments
- Do NOT add trailing slash: ❌ `https://payrollmanagement.space/`
- Correct format: ✅ `https://payrollmanagement.space`

### Step 2: Restart the Application

```bash
# For PM2
pm2 restart all

# For systemd service
sudo systemctl restart your-app-name

# For Docker
docker-compose restart

# For Node.js directly
# Kill existing process and restart
pkill node
npm start
```

### Step 3: Clear Browser Cache

Users may need to:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Or use incognito/private mode to test

## Verification

### Test the Session Endpoint
```bash
curl https://payrollmanagement.space/api/auth/session
```

Expected response:
```json
{}
```
or (if authenticated):
```json
{"user":{"name":"...","email":"..."},"expires":"..."}
```

### Check Browser Console
After the fix, you should NOT see:
- ❌ `ERR_INTERNET_DISCONNECTED`
- ❌ `CLIENT_FETCH_ERROR`
- ❌ `Failed to fetch`

You should see:
- ✅ Successful login/logout
- ✅ Session persistence across page refreshes
- ✅ No 404 errors on `/api/auth/*` routes

## Common Mistakes to Avoid

1. **Missing Protocol**
   - ❌ `NEXTAUTH_URL="payrollmanagement.space"`
   - ✅ `NEXTAUTH_URL="https://payrollmanagement.space"`

2. **Wrong Protocol**
   - ❌ `NEXTAUTH_URL="http://payrollmanagement.space"` (if you have SSL)
   - ✅ `NEXTAUTH_URL="https://payrollmanagement.space"`

3. **Trailing Slash**
   - ❌ `NEXTAUTH_URL="https://payrollmanagement.space/"`
   - ✅ `NEXTAUTH_URL="https://payrollmanagement.space"`

4. **Using localhost in Production**
   - ❌ `NEXTAUTH_URL="http://localhost:3000"`
   - ✅ `NEXTAUTH_URL="https://payrollmanagement.space"`

## Additional Environment Variables to Check

Make sure these are also set correctly:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/ckcm_payroll"

# NextAuth Secret (generate a new one for production)
NEXTAUTH_SECRET="your-secret-here"

# Google OAuth (if using)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Node Environment
NODE_ENV="production"
```

## Generating a New NEXTAUTH_SECRET

For production, generate a secure random secret:

```bash
openssl rand -base64 32
```

Or using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Related Routes Affected

This fix resolves issues with:
- `/api/auth/session` - Session management
- `/api/auth/signin` - Login
- `/api/auth/signout` - Logout
- `/api/auth/callback/*` - OAuth callbacks
- `/attendance-portal` - Public attendance portal
- All authenticated admin routes

## Testing After Deployment

1. Visit: `https://payrollmanagement.space`
2. Try to login
3. Check browser DevTools console (F12) for errors
4. Verify session persists after page refresh
5. Test logout functionality
6. Try the attendance portal: `https://payrollmanagement.space/attendance-portal`

## Files Modified

- ✅ `.env` - Fixed NEXTAUTH_URL
- ✅ `.env.production.example` - Updated template with correct format

## Commit and Deploy

```bash
# Stage changes
git add .env .env.production.example DEPLOYMENT_NEXTAUTH_FIX.md

# Commit
git commit -m "Fix: Add https:// protocol to NEXTAUTH_URL for deployment"

# Push to GitHub
git push origin main
```

## Support

If issues persist after this fix:
1. Check server logs for specific errors
2. Verify DNS is pointing to correct server
3. Ensure SSL certificate is valid
4. Check firewall rules allow HTTPS (port 443)
5. Verify NEXTAUTH_SECRET is set and matches across all instances
