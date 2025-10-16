# Fixes Applied for 404 Error on /api/attendance/punch

## Date: 2025-10-16

## Problem
The `/api/attendance/punch`, `/api/attendance/status`, and `/api/attendance/settings` routes were returning 404 errors on the deployed system but working locally.

## Root Cause
Next.js 15 may statically optimize some routes during build, causing them to not be available as API endpoints in production. This is especially common when routes don't have explicit runtime configuration.

## Fixes Applied

### 1. Added Runtime Configuration to API Routes
Added explicit `dynamic` and `runtime` exports to force dynamic rendering:

#### Files Modified:
- ✅ `src/app/api/attendance/punch/route.ts`
- ✅ `src/app/api/attendance/status/route.ts`
- ✅ `src/app/api/attendance/settings/route.ts`

```typescript
// Added to each route file
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
```

### 2. Added Base Path Support (Already Done)
Modified for deployments under sub-paths:

- ✅ `next.config.ts` - Added conditional basePath support
- ✅ `src/app/attendance-portal/page.tsx` - Updated API calls to use BASE_PATH

## Deployment Instructions

### Step 1: Clean Build
```powershell
Remove-Item -Recurse -Force .next
```

### Step 2: Rebuild
```powershell
npm run build
```

### Step 3: Test Locally
```powershell
npm start
```

Then test the endpoint:
```powershell
curl -X POST http://localhost:3000/api/attendance/punch `
  -H "Content-Type: application/json" `
  -d '{\"users_id\": \"test_user\"}'
```

### Step 4: Deploy

#### Option A: Git-based Deployment (Vercel, Netlify, etc.)
```powershell
git add .
git commit -m "Fix: Add runtime config to attendance API routes"
git push
```

#### Option B: Manual Deployment
1. Build the project: `npm run build`
2. Upload the `.next` folder and all source files
3. Ensure environment variables are set
4. Restart the server

### Step 5: Verify Deployment
Test on production:
```powershell
curl -X POST https://payrollmanagement.space/api/attendance/punch `
  -H "Content-Type: application/json" `
  -d '{\"users_id\": \"test_user\"}'
```

Expected: Should return JSON response (even if error), NOT 404

## Environment Variables Required
Make sure these are set in your deployment:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://payrollmanagement.space`
- `NEXT_PUBLIC_BASE_PATH` (optional, only if deploying under sub-path)

## What Changed
The added configuration ensures:
1. Routes are never statically optimized
2. Routes always use Node.js runtime (not Edge runtime)
3. Routes are available as API endpoints in production

## Testing Checklist
- [ ] Local build completes without errors
- [ ] API routes respond locally
- [ ] Deployment completes successfully
- [ ] `/api/attendance/punch` returns 200/400/500 (not 404)
- [ ] `/api/attendance/status` returns 200/400/500 (not 404)
- [ ] `/api/attendance/settings` returns 200 (not 404)
- [ ] Attendance portal page loads
- [ ] Time-in/out functionality works

## If Still Getting 404
1. Check deployment logs for build errors
2. Verify all files are uploaded to server
3. Check if hosting provider has special routing requirements
4. Contact hosting support with deployment logs

## Additional Notes
- The routes exist and have proper exports
- TypeScript types are correct
- Prisma client is properly configured
- The issue was Next.js build optimization behavior
