# Deployment Fix for 404 Error on /api/attendance/punch

## Problem
The `/api/attendance/punch` route returns 404 on deployed system but works locally.

## Root Cause
This is typically caused by:
1. Incomplete deployment build
2. Missing route files in deployment
3. Caching issues
4. Build output configuration

## Solutions (Try in order)

### Solution 1: Rebuild and Redeploy
```bash
# Clean build artifacts
Remove-Item -Recurse -Force .next

# Rebuild
npm run build

# If you're using a deployment platform (Vercel, Netlify, etc.):
# - Push changes to git
# - Trigger a fresh deployment
# - Make sure the deployment doesn't use cached builds
```

### Solution 2: Verify Route File Structure
Make sure the following files exist:
- ✅ `src/app/api/attendance/punch/route.ts` (EXISTS)
- ✅ Route exports `POST` function (VERIFIED)

### Solution 3: Check Deployment Platform Settings

#### For Vercel:
1. Go to project settings
2. Clear build cache
3. Redeploy with "Force new deployment"
4. Make sure build command is: `npm run build`
5. Make sure output directory is: `.next`

#### For other platforms:
- Ensure all files in `src/app/api/` are included in deployment
- Check if there's a file upload limit or path restriction
- Verify the build process completes successfully

### Solution 4: Add Route Config (if needed)
The route already has proper exports, but you can add explicit config:

```typescript
// At the top of src/app/api/attendance/punch/route.ts
export const dynamic = 'force-dynamic' // Disable static optimization
export const runtime = 'nodejs' // Use Node.js runtime
```

### Solution 5: Check Next.js Config
The `next.config.ts` should NOT exclude API routes. Current config looks good.

### Solution 6: Environment Variables
Make sure your deployment has all required environment variables:
- `DATABASE_URL` (for Prisma)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- Any other env vars your app needs

### Solution 7: Check Deployment Logs
Look for build errors in your deployment platform:
- Route generation errors
- TypeScript errors
- Missing dependencies
- Database connection issues

## Quick Test
After redeploying, test the endpoint:
```bash
curl -X POST https://payrollmanagement.space/api/attendance/punch \
  -H "Content-Type: application/json" \
  -d '{"users_id": "test"}'
```

Expected response (even with invalid user):
- 400 or 404 with error message (NOT 404 on the route itself)

## If Still Not Working
The issue might be with your hosting provider's routing configuration. You may need to:
1. Add a `vercel.json` or equivalent config file
2. Configure rewrites/redirects
3. Contact hosting support

## Contact
If none of these work, provide:
- Hosting platform name
- Build logs
- Deployment logs
- Any error messages
