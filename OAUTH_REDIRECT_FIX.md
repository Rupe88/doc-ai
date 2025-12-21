# 🔧 OAuth Redirect URI Fix

## ⚠️ The Error

**"The redirect_uri is not associated with this application"**

This means the redirect URI in your GitHub OAuth app settings doesn't match what the code is sending.

---

## ✅ Solution

### Option 1: Update GitHub OAuth App (Recommended)

**Your GitHub OAuth App should have:**
- **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`

**Steps:**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click on your OAuth App
3. Update **Authorization callback URL** to:
   ```
   http://localhost:3000/api/auth/callback/github
   ```
4. Click **Update application**
5. Make sure `.env.local` has:
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### Option 2: Keep Current Route (If you prefer)

If you want to keep `/api/auth/github` as callback:
1. Update GitHub OAuth app callback URL to: `http://localhost:3000/api/auth/github`
2. The code will work as-is

---

## 🔄 What Changed

**Before:**
- Callback route: `/api/auth/github`
- Used for both OAuth initiation and callback

**After:**
- Connect route: `/api/github/connect` (initiates OAuth)
- Callback route: `/api/auth/callback/github` (handles callback)

**Why?**
- Cleaner separation of concerns
- Matches common OAuth patterns
- Easier to understand flow

---

## 📝 GitHub OAuth App Configuration

### Required Settings:

1. **Application name**: Your app name
2. **Homepage URL**: `http://localhost:3000` (or your domain)
3. **Authorization callback URL**: 
   - **Development**: `http://localhost:3000/api/auth/callback/github`
   - **Production**: `https://yourdomain.com/api/auth/callback/github`

### Important Notes:

- ✅ **Exact match required** - GitHub checks the redirect URI exactly
- ✅ **No trailing slash** - Don't add `/` at the end
- ✅ **Protocol matters** - Use `http://` for localhost, `https://` for production
- ✅ **Case sensitive** - URLs are case-sensitive

---

## 🧪 Testing

### 1. Check Environment Variables
```bash
# Make sure these are set in .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

### 2. Verify GitHub Settings
- Go to GitHub OAuth app settings
- Check callback URL matches exactly: `http://localhost:3000/api/auth/callback/github`

### 3. Test Flow
1. Start dev server: `npm run dev`
2. Click "Login" or "Get Started"
3. Should redirect to GitHub
4. Authorize app
5. Should redirect back to `/dashboard`

---

## 🐛 Common Issues

### Issue 1: Still getting redirect_uri error
**Fix**: 
- Double-check GitHub OAuth app callback URL
- Make sure it matches exactly (no trailing slash, correct protocol)
- Clear browser cache and try again

### Issue 2: Redirects to wrong URL
**Fix**:
- Check `NEXT_PUBLIC_APP_URL` in `.env.local`
- Restart dev server after changing `.env.local`
- Verify GitHub callback URL matches

### Issue 3: Works locally but not in production
**Fix**:
- Create separate OAuth app for production
- Use `https://` in production callback URL
- Set `NEXT_PUBLIC_APP_URL` to production domain

---

## ✅ Quick Checklist

- [ ] GitHub OAuth app created
- [ ] Callback URL set to: `http://localhost:3000/api/auth/callback/github`
- [ ] `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local`
- [ ] `GITHUB_CLIENT_ID` set in `.env.local`
- [ ] `GITHUB_CLIENT_SECRET` set in `.env.local`
- [ ] Restarted dev server
- [ ] Tested login flow

---

## 🎯 Summary

**The fix**: Update your GitHub OAuth app callback URL to match what the code expects:
- **Development**: `http://localhost:3000/api/auth/callback/github`
- **Production**: `https://yourdomain.com/api/auth/callback/github`

Make sure `NEXT_PUBLIC_APP_URL` in `.env.local` matches your environment!

That's it! Your OAuth should work now! 🎉

