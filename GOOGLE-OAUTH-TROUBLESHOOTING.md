# Google OAuth Troubleshooting Guide

## ✅ ISSUE RESOLVED: Environment Variables Missing

**Root Cause:** The Google OAuth environment variables were not set in your `.env` file.

**Solution Applied:**
1. ✅ Added `GOOGLE_CLIENT_ID` to `.env` file
2. ✅ Added `GOOGLE_CLIENT_SECRET` to `.env` file
3. ✅ Restarted development server

## 🔧 Current Configuration

Your `.env` file now contains:
```env
# Database Configuration (XAMPP MySQL)
DATABASE_URL="mysql://root:@localhost:3306/ckcm_payroll"

# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="5562dac42aa6c46464ff3682a5d46243e1faf8ff4241e932fd75833003cfa14c"


```

## 🌐 Google Console Configuration Required

**IMPORTANT:** You need to configure your Google OAuth app with the correct redirect URI:

### Steps to Configure Google Console:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create one)

2. **Navigate to OAuth Configuration:**
   - Go to "APIs & Services" → "Credentials"
   - Find your OAuth 2.0 Client ID
   - Click on it to edit

3. **Add Authorized Redirect URIs:**
   ```
   http://localhost:3000/api/auth/callback/google
   ```

4. **For Production (when you deploy):**
   ```
   https://yourdomain.com/api/auth/callback/google
   ```

5. **Save the changes**

## 🧪 Testing Steps

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open browser and go to:**
   ```
   http://localhost:3000
   ```

3. **Click "Sign in with Google"**

4. **Expected behavior:**
   - Should redirect to Google OAuth page
   - Should ask for email/password
   - Should redirect back to your app
   - Should show account setup page (for new users)

## 🐛 Common Issues & Solutions

### Issue 1: "Error 400: redirect_uri_mismatch"
**Solution:** Add the correct redirect URI to Google Console:
```
http://localhost:3000/api/auth/callback/google
```

### Issue 2: "Access blocked: This app's request is invalid"
**Solution:** 
- Check if your Google account email ends with `@ckcm.edu.ph`
- Only CKCM email addresses are allowed

### Issue 3: "Invalid client"
**Solution:**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` file
- Restart the development server after adding environment variables

### Issue 4: Nothing happens when clicking Google sign in
**Solution:**
- Check browser console for JavaScript errors (F12)
- Check server console for error messages
- Verify environment variables are loaded

## 🔍 Debug Information

### Browser Console Debug:
1. Open browser developer tools (F12)
2. Go to Console tab
3. Click "Sign in with Google"
4. Look for any error messages

### Server Console Debug:
1. Check your terminal where `npm run dev` is running
2. Look for any error messages when clicking Google sign in

## 📱 Testing with Different Accounts

### Test Accounts:
- **Valid:** Any email ending with `@ckcm.edu.ph`
- **Invalid:** Any other email domain (should be blocked)

### Expected Flow:
1. **New User (first time):**
   - Google OAuth → Account Setup → Personnel Dashboard

2. **Existing User:**
   - Google OAuth → Direct to appropriate dashboard

## 🚀 Next Steps

1. **Configure Google Console** with correct redirect URI
2. **Test the flow** with a `@ckcm.edu.ph` email
3. **Verify account setup** works properly
4. **Check redirect** to personnel dashboard

## 📞 If Issues Persist

If you're still having issues:

1. **Check browser console** for JavaScript errors
2. **Check server console** for error messages
3. **Verify Google Console** redirect URI configuration
4. **Test with different browser** or incognito mode
5. **Clear browser cache** and cookies

The most common issue is the redirect URI mismatch in Google Console!

