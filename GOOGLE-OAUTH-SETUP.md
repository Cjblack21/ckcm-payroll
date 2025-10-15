# Google OAuth Integration Setup Guide

## 🚀 Implementation Complete!

Your LegendarySystem_v2.1.0 now has full Google OAuth integration with domain restriction and account setup flow.

## 📋 What's Been Implemented

### ✅ Google OAuth Provider Configuration
- Added Google provider to `src/lib/auth.ts`
- Configured with your provided client credentials
- Domain restriction to `@ckcm.edu.ph` emails only
- Proper error handling and validation

### ✅ Account Setup Flow
- Created `/account-setup` page with:
  - Profile picture and name from Google
  - School ID input field (serves as user ID)
  - Personnel Type dropdown (fetched from database)
  - Form validation and error handling

### ✅ Authentication Flow
- **New Users**: Google sign-in → Account setup → Personnel dashboard
- **Existing Users**: Google sign-in → Direct to appropriate dashboard
- **Domain Restriction**: Only `@ckcm.edu.ph` emails allowed

### ✅ Database Integration
- Created `createUserAccount` server action
- Uses School ID as primary key (`users_id`)
- Automatically assigns `PERSONNEL` role
- Links to selected Personnel Type

### ✅ UI Updates
- Updated login form with Google sign-in button
- Added proper styling and Google branding
- Responsive design with clear user instructions

## 🔧 Environment Variables Required

Add these to your `.env.local` file:

```env
# Google OAuth Configuration


# NextAuth Configuration (if not already set)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

## 🌐 Google Console Configuration

Make sure your Google OAuth app has these redirect URIs:
- **Development**: `http://localhost:3000/api/auth/callback/google`
- **Production**: `https://yourdomain.com/api/auth/callback/google`

## 🔄 User Flow

### For New Users:
1. User clicks "Sign in with Google" on login page
2. Google OAuth flow (domain restriction applied)
3. Redirected to `/account-setup` page
4. User fills in School ID and selects Personnel Type
5. Account created in database with School ID as primary key
6. Redirected to personnel dashboard

### For Existing Users:
1. User clicks "Sign in with Google"
2. Google OAuth flow (domain restriction applied)
3. System checks if user exists in database
4. Redirected directly to appropriate dashboard based on role

## 🛡️ Security Features

- **Domain Restriction**: Only `@ckcm.edu.ph` emails allowed
- **Email Verification**: Google's `email_verified` check
- **Unique School ID**: Prevents duplicate user creation
- **Role-based Access**: Automatic PERSONNEL role assignment
- **Session Management**: Proper JWT token handling

## 🎯 Key Files Modified

1. **`src/lib/auth.ts`** - Google provider configuration
2. **`src/app/account-setup/page.tsx`** - Account setup page
3. **`src/lib/actions/auth.ts`** - User creation server action
4. **`src/middleware.ts`** - Route protection updates
5. **`src/components/login-form.tsx`** - Google sign-in button

## 🧪 Testing

1. Start your development server: `npm run dev`
2. Go to login page
3. Click "Sign in with Google"
4. Use a `@ckcm.edu.ph` email for testing
5. Complete account setup flow
6. Verify redirect to personnel dashboard

## 🚨 Important Notes

- **School ID Uniqueness**: Each School ID must be unique across the system
- **Personnel Types**: Ensure personnel types are created in admin panel first
- **Database Schema**: No schema changes needed - uses existing User model
- **Password Field**: OAuth users have empty password field (secure)

## 🔧 Troubleshooting

### Common Issues:
1. **"Invalid client"**: Check Google Console redirect URIs
2. **"Access denied"**: Verify domain restriction is working
3. **"Personnel type not found"**: Ensure personnel types exist in database
4. **"School ID taken"**: Use a unique School ID

### Debug Steps:
1. Check browser console for errors
2. Verify environment variables are set
3. Check Google Console configuration
4. Ensure database connection is working

## 🎉 Ready to Use!

Your Google OAuth integration is now complete and ready for production use. Users with `@ckcm.edu.ph` emails can now sign in with Google and complete their account setup seamlessly!

