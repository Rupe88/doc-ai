# 🔐 Webhook Secrets Integration Guide

## 📋 Overview

This guide explains how to set up and integrate webhook secrets for GitHub and Paddle webhooks.

---

## 🔑 Required Webhook Secrets

You need two webhook secrets:

1. **GITHUB_WEBHOOK_SECRET** - For GitHub repository webhooks
2. **PADDLE_WEBHOOK_SECRET** - For Paddle payment webhooks

---

## 🔵 GitHub Webhook Secret Setup

### Step 1: Create GitHub Webhook Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Set **Payload URL**: `https://yourdomain.com/api/github/webhook`
4. Set **Content type**: `application/json`
5. Set **Secret**: Generate a random secret (see below)
6. Select events: **Push**, **Pull Request**, **Pull Request Review**
7. Click **Add webhook**

### Step 2: Generate Secret

**Option 1: Using OpenSSL** (Recommended)
```bash
openssl rand -hex 32
```

**Option 2: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 3: Using Online Generator**
- Visit: https://www.random.org/strings/
- Generate a random string (32+ characters)

### Step 3: Add to `.env.local`

```env
GITHUB_WEBHOOK_SECRET=your-generated-secret-here
```

**Important**: 
- Use the **same secret** you set in GitHub webhook settings
- Keep it secure and never commit to git
- Use different secrets for development and production

---

## 💳 Paddle Webhook Secret Setup

### Step 1: Get Paddle Webhook Secret

1. Log in to [Paddle Dashboard](https://vendors.paddle.com/)
2. Go to **Developer Tools** → **Notifications** → **Webhooks**
3. Click **Add webhook endpoint** or edit existing
4. Set **Webhook URL**: `https://yourdomain.com/api/paddle/webhook`
5. Copy the **Signing Secret** (this is your webhook secret)

### Step 2: Add to `.env.local`

```env
PADDLE_WEBHOOK_SECRET=your-paddle-signing-secret-here
```

**Important**:
- Use the signing secret from Paddle dashboard
- Different secrets for sandbox and production
- Keep it secure and never commit to git

---

## 🔧 How Webhook Verification Works

### GitHub Webhook Verification

**Signature Format**: `sha256=<hex-digest>`
**Header**: `X-Hub-Signature-256`

**Process**:
1. GitHub sends webhook with `X-Hub-Signature-256` header
2. Server calculates HMAC-SHA256 of payload using secret
3. Compares calculated signature with header signature
4. Uses timing-safe comparison to prevent timing attacks

**Code** (`lib/github/webhook.ts`):
```typescript
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = 'sha256=' + hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}
```

### Paddle Webhook Verification

**Signature Format**: Base64 HMAC-SHA256
**Header**: `Paddle-Signature`

**Process**:
1. Paddle sends webhook with `Paddle-Signature` header
2. Server calculates HMAC-SHA256 of payload using secret
3. Encodes result as Base64
4. Compares with header signature

**Code** (`lib/paddle/client.ts`):
```typescript
verifyWebhook(signature: string, body: string): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET || ''
  const hmac = require('crypto').createHmac('sha256', secret)
  const hash = hmac.update(body).digest('base64')
  return signature === hash
}
```

---

## 📝 Complete `.env.local` Example

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret-32-chars-min

# Paddle Payment
PADDLE_API_KEY=your-paddle-api-key
PADDLE_SANDBOX_API_KEY=your-paddle-sandbox-api-key
PADDLE_WEBHOOK_SECRET=your-paddle-webhook-signing-secret
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox

# Other config...
```

---

## 🧪 Testing Webhook Secrets

### Test GitHub Webhook

**Using GitHub CLI**:
```bash
# Install GitHub CLI if needed
gh webhook forward --repo owner/repo --events push --url http://localhost:3000/api/github/webhook
```

**Using ngrok** (for local testing):
```bash
# Install ngrok
ngrok http 3000

# Use ngrok URL in GitHub webhook settings
# https://abc123.ngrok.io/api/github/webhook
```

**Manual Test**:
```bash
# Generate test payload
curl -X POST http://localhost:3000/api/github/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '{"test":true}' | openssl dgst -sha256 -hmac 'your-secret' | cut -d' ' -f2)" \
  -d '{"test":true}'
```

### Test Paddle Webhook

**Using Paddle Sandbox**:
1. Go to Paddle Dashboard → Developer Tools → Notifications
2. Click **Send test notification**
3. Select event type (e.g., `subscription.created`)
4. Paddle will send test webhook to your endpoint

**Manual Test**:
```bash
# Generate test signature
SECRET="your-paddle-secret"
BODY='{"event_type":"subscription.created","data":{}}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# Send test webhook
curl -X POST http://localhost:3000/api/paddle/webhook \
  -H "Content-Type: application/json" \
  -H "Paddle-Signature: $SIGNATURE" \
  -d "$BODY"
```

---

## 🔒 Security Best Practices

### 1. **Never Commit Secrets**
- Add `.env.local` to `.gitignore`
- Use environment variables in production
- Use secrets management (Vercel, AWS Secrets Manager, etc.)

### 2. **Use Different Secrets**
- Development: Use test secrets
- Production: Use production secrets
- Never reuse secrets across environments

### 3. **Rotate Secrets Regularly**
- Rotate every 90 days
- Update both GitHub/Paddle settings and `.env.local`
- Test after rotation

### 4. **Verify Signatures Always**
- Never skip signature verification
- Return 401 if signature invalid
- Log failed verification attempts

### 5. **Use HTTPS in Production**
- Webhooks must use HTTPS
- GitHub/Paddle require HTTPS for production
- Use Let's Encrypt or similar

---

## 🚨 Troubleshooting

### GitHub Webhook Issues

**Problem**: "Invalid signature" error
- ✅ Check `GITHUB_WEBHOOK_SECRET` matches GitHub webhook settings
- ✅ Ensure secret is set in `.env.local`
- ✅ Verify webhook URL is correct
- ✅ Check payload is not modified (must be raw body)

**Problem**: Webhook not received
- ✅ Check GitHub webhook delivery logs
- ✅ Verify webhook URL is accessible
- ✅ Check firewall/security settings
- ✅ Ensure webhook is active in GitHub

### Paddle Webhook Issues

**Problem**: "Invalid signature" error
- ✅ Check `PADDLE_WEBHOOK_SECRET` matches Paddle dashboard
- ✅ Ensure secret is set in `.env.local`
- ✅ Verify webhook URL is correct
- ✅ Check you're using correct secret (sandbox vs production)

**Problem**: Webhook not received
- ✅ Check Paddle webhook logs in dashboard
- ✅ Verify webhook URL is accessible
- ✅ Check firewall/security settings
- ✅ Ensure webhook endpoint is active

---

## 📚 Additional Resources

- [GitHub Webhooks Documentation](https://docs.github.com/en/webhooks)
- [Paddle Webhooks Documentation](https://developer.paddle.com/webhooks)
- [Webhook Security Best Practices](https://docs.github.com/en/webhooks/using-webhooks/securing-your-webhooks)

---

## ✅ Checklist

- [ ] Generated GitHub webhook secret
- [ ] Added secret to GitHub webhook settings
- [ ] Added `GITHUB_WEBHOOK_SECRET` to `.env.local`
- [ ] Got Paddle webhook signing secret
- [ ] Added `PADDLE_WEBHOOK_SECRET` to `.env.local`
- [ ] Tested GitHub webhook locally
- [ ] Tested Paddle webhook locally
- [ ] Verified webhook signatures work
- [ ] Added `.env.local` to `.gitignore`
- [ ] Set up production secrets

---

## 🎯 Quick Setup Commands

```bash
# Generate GitHub webhook secret
GITHUB_SECRET=$(openssl rand -hex 32)
echo "GITHUB_WEBHOOK_SECRET=$GITHUB_SECRET" >> .env.local

# Add to .env.local manually:
# PADDLE_WEBHOOK_SECRET=your-paddle-secret-from-dashboard
```

---

## 💡 Pro Tips

1. **Use Environment-Specific Secrets**: Different secrets for dev/staging/prod
2. **Monitor Webhook Failures**: Set up alerts for failed webhook deliveries
3. **Test Regularly**: Test webhooks after code changes
4. **Document Secrets**: Keep track of where secrets are used (but not the secrets themselves!)
5. **Use Secret Rotation**: Rotate secrets periodically for security

---

Your webhook secrets are now properly integrated! 🎉

