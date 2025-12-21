# 🔐 GitHub OAuth Setup Guide

## ⚠️ Redirect URI Mismatch Fix

### The Problem
You're getting: **"The redirect_uri is not associated with this application"**

This happens when the redirect URI in your GitHub OAuth app settings doesn't match what the code is sending.

---

## ✅ Solution: Update GitHub OAuth App Settings

### Step 1: Check Your Current Settings

**In your GitHub OAuth App** (https://github.com/settings/developers):
- **Authorization callback URL**: Should be `http://localhost:3000/api/auth/callback/github`

### Step 2: Update GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click on your OAuth App (or create a new one)
3. Set **Authorization callback URL** to:
   ```
   http://localhost:3000/api/auth/callback/github
   ```
4. Click **Update application**

### Step 3: Verify `.env.local`

Make sure your `.env.local` has:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

---

## 🔧 How It Works

### OAuth Flow:
1. User clicks "Login" → `/api/github/connect`
2. Redirects to GitHub with callback: `/api/auth/callback/github`
3. GitHub redirects back → `/api/auth/callback/github?code=...`
4. Code exchanges for token
5. User created/updated in database
6. Session created
7. Redirects to `/dashboard`

### Important URLs:

**OAuth Redirect** (`/api/github/connect`):
- Redirects user to GitHub OAuth
- Uses callback: `/api/auth/callback/github`

**OAuth Callback** (`/api/auth/callback/github`):
- Receives `code` from GitHub
- Exchanges code for access token
- Creates/updates user
- Creates session
- Redirects to dashboard

---

## 🧪 Testing

### Local Development:
1. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`
2. GitHub callback URL: `http://localhost:3000/api/auth/callback/github`
3. Start dev server: `npm run dev`
4. Click "Login" → Should redirect to GitHub → Back to dashboard

### Production:
1. Set `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
2. GitHub callback URL: `https://yourdomain.com/api/auth/callback/github`
3. Deploy → Test login flow

---

## 🔒 Security Notes

- ✅ Use HTTPS in production
- ✅ Never commit `.env.local`
- ✅ Use different OAuth apps for dev/prod
- ✅ Keep `GITHUB_CLIENT_SECRET` secure

---

## 🐛 Troubleshooting

### Error: "redirect_uri mismatch"
- ✅ Check GitHub OAuth app callback URL matches exactly
- ✅ Check `NEXT_PUBLIC_APP_URL` in `.env.local`
- ✅ Ensure no trailing slashes
- ✅ Use `http://` for localhost, `https://` for production

### Error: "Invalid client_id"
- ✅ Check `GITHUB_CLIENT_ID` in `.env.local`
- ✅ Verify it matches GitHub OAuth app

### Error: "Invalid client_secret"
- ✅ Check `GITHUB_CLIENT_SECRET` in `.env.local`
- ✅ Regenerate secret in GitHub if needed

---

## 📝 Quick Checklist

- [ ] GitHub OAuth app created
- [ ] Callback URL set to: `http://localhost:3000/api/auth/callback/github`
- [ ] `GITHUB_CLIENT_ID` in `.env.local`
- [ ] `GITHUB_CLIENT_SECRET` in `.env.local`
- [ ] `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local`
- [ ] Test login flow

---

## ✅ After Setup

Once configured correctly:
1. Click "Login" or "Get Started"
2. You'll be redirected to GitHub
3. Authorize the application
4. GitHub redirects back to your app
5. You're logged in and redirected to dashboard

That's it! Your GitHub OAuth is now properly configured! 🎉

