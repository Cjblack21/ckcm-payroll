# Avatar and RSC Routing Fixes

## Issues Fixed

### 1. Avatar 404 Error
**Error:** `GET https://payrollmanagement.space/avatars/admin.jpg 404 (Not Found)`

**Root Cause:**
- User has `/avatars/admin.jpg` path stored in database
- File doesn't exist in `public/avatars/` folder
- Avatar component tries to load non-existent image

**Fix Applied:**
- Created placeholder avatar: `public/avatars/admin.jpg` (copy of ckcm.png)
- Avatar component already has fallback (initials) when image fails to load

### 2. RSC Route Error  
**Error:** `GET https://payrollmanagement.space/admin/leaves?_rsc=1wn8o 404 (Not Found)`

**Root Cause:**
- React Server Components (RSC) requests failing for `/admin/leaves` route
- Possible causes:
  - Route not built correctly
  - Middleware blocking RSC requests
  - Missing `'use client'` directive (already fixed)

**Status:**
- ✅ `/admin/leaves/page.tsx` has `'use client'` directive
- ✅ Page exports default component
- ✅ Builds successfully locally

## Deployment Checklist

### On Production Server:

1. **Update Code:**
```bash
cd /path/to/app
git pull origin main
```

2. **Ensure Avatar Directory Exists:**
```bash
mkdir -p public/avatars
# Upload admin.jpg or copy a placeholder
cp public/ckcm.png public/avatars/admin.jpg
```

3. **Clean Build:**
```bash
rm -rf .next
npm run build
```

4. **Restart Application:**
```bash
pm2 restart all
# or your restart command
```

5. **Clear Browser Cache:**
- Hard refresh: Ctrl+F5
- Or use incognito mode

## Files Modified

- ✅ `public/avatars/admin.jpg` - Created placeholder avatar
- ✅ `src/app/admin/leaves/page.tsx` - Already has `'use client'`

## Testing

### Test Avatar:
```bash
curl -I https://payrollmanagement.space/avatars/admin.jpg
# Should return 200 OK
```

### Test Leaves Route:
1. Login to admin dashboard
2. Navigate to `/admin/leaves`
3. Should load without 404 errors
4. Check browser console - no RSC errors

## Common RSC 404 Causes

If `/admin/leaves` still returns 404 after fixes:

### 1. Middleware Blocking RSC Requests
Check `src/middleware.ts` - ensure it allows `_rsc` query params:

```typescript
// Should NOT block routes with _rsc parameter
if (pathname.startsWith("/_next")) {
  return NextResponse.next()
}
```

### 2. Build Cache Issue
```bash
# On server
rm -rf .next
npm run build
pm2 restart all
```

### 3. Missing Route in Build
Check build output:
```bash
npm run build | grep leaves
# Should show: ƒ /admin/leaves
```

### 4. Incorrect Deployment
Ensure `.next` folder is uploaded/built on server with all files.

## Verification Commands

```bash
# Check avatar exists
ls -la public/avatars/admin.jpg

# Check leaves page exists  
ls -la src/app/admin/leaves/page.tsx

# Check build output
npm run build 2>&1 | grep -A 2 "admin/leaves"

# Test production build locally
npm run build
npm start
# Then visit: http://localhost:3000/admin/leaves
```

## Related Files

- `src/components/nav-user.tsx` - Uses avatar
- `src/app/admin/leaves/page.tsx` - Leaves route
- `src/middleware.ts` - Route protection
- `public/avatars/` - Avatar directory

## Additional Notes

### Avatar Best Practices:
1. Always use fallback (initials/icon) when image fails
2. Store avatars in `public/avatars/` directory
3. Use user ID as filename: `{users_id}.jpg`
4. Add database field for avatar URL if needed

### RSC Best Practices:
1. Use `'use client'` for interactive components
2. Server components for data fetching
3. Don't block `_rsc` requests in middleware
4. Ensure all routes build correctly

## If Issues Persist

1. Check server logs for specific errors
2. Verify all files deployed correctly
3. Test locally with production build
4. Check Next.js build output for warnings
5. Ensure middleware isn't blocking routes
