# 🔓 Clear Your Rate Limit

## ✅ Free Tier Updated: 5 Generations/Hour

The free tier limit has been increased from **1** to **5** generations per hour!

---

## 🚀 Clear Your Current Rate Limit

Since you already hit the limit, you have two options:

### Option 1: Wait (Easiest)
Wait for the rate limit window to expire (usually 1 hour from when you first generated).

### Option 2: Clear Manually (Immediate)

**If you have Redis configured**, you can clear your rate limit:

1. **Get your User ID** from the database or terminal logs
2. **Run this command**:
   ```bash
   # Using Node.js REPL
   node -e "
   const { Redis } = require('@upstash/redis');
   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL,
     token: process.env.UPSTASH_REDIS_REST_TOKEN
   });
   redis.del('rate_limit:generate:YOUR_USER_ID').then(() => console.log('Cleared!'));
   "
   ```

3. **Or use the script** (if you have tsx installed):
   ```bash
   npx tsx scripts/clear-rate-limit.ts YOUR_USER_ID
   ```

---

## 📊 New Rate Limits

- **FREE**: 5 generations/hour ✅ (was 1)
- **PRO**: 10 generations/hour
- **TEAM**: 50 generations/hour
- **ENTERPRISE**: Unlimited

---

## ✅ What Changed

1. ✅ Free tier limit increased: 1 → 5 per hour
2. ✅ Error message updated to reflect new limit
3. ✅ Added helper function to clear rate limits

**Try generating again - you should have 5 attempts per hour now! 🎉**

