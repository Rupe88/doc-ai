# ⚡ Quick Webhook Secrets Setup

## 🔑 Step-by-Step Setup

### 1. GitHub Webhook Secret

**Generate Secret**:
```bash
openssl rand -hex 32
```

**Add to `.env.local`**:
```env
GITHUB_WEBHOOK_SECRET=your-generated-secret-here
```

**Setup in GitHub**:
1. Go to your repo → Settings → Webhooks → Add webhook
2. Payload URL: `https://yourdomain.com/api/github/webhook`
3. Content type: `application/json`
4. Secret: Paste the same secret from `.env.local`
5. Events: Select `push`, `pull_request`
6. Save webhook

### 2. Paddle Webhook Secret

**Get from Paddle Dashboard**:
1. Login to [Paddle Dashboard](https://vendors.paddle.com/)
2. Go to Developer Tools → Notifications → Webhooks
3. Add/edit webhook endpoint
4. URL: `https://yourdomain.com/api/paddle/webhook`
5. Copy the **Signing Secret**

**Add to `.env.local`**:
```env
PADDLE_WEBHOOK_SECRET=your-paddle-signing-secret
```

---

## ✅ Verification

### Test GitHub Webhook
```bash
# Check webhook is receiving events
# Go to GitHub repo → Settings → Webhooks → Recent Deliveries
```

### Test Paddle Webhook
```bash
# In Paddle Dashboard → Developer Tools → Notifications
# Click "Send test notification"
```

---

## 🔒 Security Notes

- ✅ Never commit `.env.local` to git
- ✅ Use different secrets for dev/prod
- ✅ Rotate secrets every 90 days
- ✅ Keep secrets secure

---

## 📝 Complete `.env.local` Example

```env
# GitHub
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_WEBHOOK_SECRET=your-webhook-secret-32-chars-min

# Paddle
PADDLE_API_KEY=your-api-key
PADDLE_SANDBOX_API_KEY=your-sandbox-key
PADDLE_WEBHOOK_SECRET=your-paddle-signing-secret
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
```

That's it! Your webhooks are now properly configured! 🎉

