# NOWPayments Integration Setup Guide

Complete step-by-step guide to integrate NOWPayments crypto payments into DocAI.

## 🚀 Overview

NOWPayments enables you to accept **40+ cryptocurrencies** globally without banking restrictions. Perfect for Nepal-based SaaS businesses.

### ✨ Key Features
- ✅ **40+ cryptocurrencies** (BTC, ETH, USDC, USDT, LTC, etc.)
- ✅ **0.5% transaction fees** (lower than most processors)
- ✅ **No banking restrictions** (works from Nepal)
- ✅ **Global payments** (accept from US, Europe, Asia)
- ✅ **Instant confirmations** (real-time IPN notifications)
- ✅ **Enterprise security** (HMAC-SHA256 signature verification)
- ✅ **Multi-currency support** (auto-conversion available)

---

## 📋 STEP-BY-STEP SETUP

### Step 1: Create NOWPayments Account

1. **Visit NOWPayments:** https://nowpayments.io/
2. **Sign Up:** Choose "Business Account"
3. **Fill Business Details:**
   - Business name: **DocAI**
   - Business type: **Software/SaaS**
   - Country: **Nepal**
   - Industry: **Technology**
4. **Complete KYC Verification:**
   - Government ID (passport/citizenship)
   - Business registration (if applicable)
   - Takes 1-3 business days

### Step 2: Get API Credentials

After account approval:

#### Get API Key:
1. Go to **Dashboard** → **API Keys**
2. Click **"Create API Key"**
3. Set permissions: ✅ **Read**, ✅ **Write**, ✅ **Delete**
4. **Copy API Key** (save securely - shown only once)

#### Get IPN Secret:
1. Go to **Settings** → **IPN Settings**
2. Click **"Add IPN URL"**
3. **URL:** `https://yourdomain.com/api/crypto/webhook`
4. **Copy IPN Secret** (save securely)

### Step 3: Configure Environment Variables

Add to your `.env.local` file:

```bash
# NOWPayments Configuration
NOWPAYMENTS_API_KEY="your_api_key_here"
NOWPAYMENTS_IPN_SECRET="your_ipn_secret_here"
```

### Step 4: Test Integration

#### Test API Key:
```bash
curl -X GET "https://api.nowpayments.io/v1/currencies" \
  -H "x-api-key: YOUR_API_KEY"
```

#### Test Payment Flow:
1. Visit DocAI pricing page
2. Try upgrading to PRO plan ($29)
3. Complete crypto payment
4. Verify subscription activation

---

## 🔧 TECHNICAL INTEGRATION

### API Endpoints

#### Create Payment:
```typescript
POST /api/crypto/checkout
{
  "tier": "PRO"
}
```

#### Webhook Handler:
```
POST /api/crypto/webhook
Headers: x-nowpayments-sig
```

#### Get Subscription:
```typescript
GET /api/crypto/subscription
```

### Supported Cryptocurrencies

NOWPayments supports 40+ cryptocurrencies:

**Popular Choices:**
- **USDC** (Recommended - stablecoin)
- **USDT** (Tether - stablecoin)
- **BTC** (Bitcoin)
- **ETH** (Ethereum)
- **LTC** (Litecoin)
- **BNB** (Binance Coin)

### Payment Flow

1. **User clicks "Upgrade"** → Frontend calls `/api/crypto/checkout`
2. **NOWPayments creates payment** → Returns invoice URL & wallet address
3. **User pays crypto** → NOWPayments detects payment
4. **IPN notification sent** → DocAI processes webhook
5. **Subscription activated** → User gets PRO features

---

## 💰 PRICING & FEES

### Transaction Fees:
- **0.5%** per transaction (very competitive!)
- **No monthly fees**
- **No setup fees**
- **No hidden costs**

### Example Costs:
- **$29 PRO plan:** $0.145 fee (you keep $28.855)
- **$99 TEAM plan:** $0.495 fee (you keep $98.505)
- **$299 ENTERPRISE:** $1.495 fee (you keep $297.505)

### Comparison:
| Processor | Fee | Works in Nepal? |
|-----------|-----|-----------------|
| NOWPayments | 0.5% | ✅ Yes |
| Coinbase | 1% | ❌ No |
| Stripe | 2.9% + 30¢ | ❌ No |
| PayPal | 2.9% + 30¢ | ⚠️ Limited |

---

## 🔒 SECURITY FEATURES

### IPN Signature Verification:
```typescript
// HMAC-SHA256 signature validation
const isValid = nowpayments.verifyIPNSignature(payload, signature);
if (!isValid) return res.status(401).json({ error: 'Invalid signature' });
```

### Data Encryption:
- All API calls use HTTPS
- Sensitive data encrypted in database
- Environment variables secured

### Fraud Prevention:
- IPN signature verification
- Amount validation
- User authentication required
- Rate limiting on API endpoints

---

## 🌍 WITHDRAWAL GUIDE (NEPAL)

### Convert Crypto to NPR:

#### Option 1: P2P Trading (Recommended)
```
1. Receive crypto in NOWPayments wallet
2. Transfer to Binance/BitGet exchange
3. Sell crypto for USD via P2P
4. Transfer USD to Nepal bank (Global IME/Nabil)
5. Convert USD to NPR at bank
```

#### Option 2: Local Exchanges
- **MEXC, KuCoin** - Direct Nepal support
- **Convert crypto → USD → NPR**

#### Option 3: Money Transfer Services
- **Wise/Remitly** - Transfer USD to Nepal
- **Western Union** - Cash pickup in Nepal

### Timeline:
- **P2P Trading:** 1-2 hours (quick cash)
- **Bank Transfer:** 1-3 days (regular income)
- **Money Transfer:** Same day (with fees)

---

## 🧪 TESTING

### Test Mode:
NOWPayments provides sandbox environment for testing.

```bash
# Use testnet API endpoint
const testnet = true; // In development
```

### Test Payment:
1. Use small amounts ($1-5)
2. Test different cryptocurrencies
3. Verify webhook delivery
4. Check subscription activation

### Production Checklist:
- [ ] Real API credentials configured
- [ ] Live webhook URL set
- [ ] Domain SSL certificate valid
- [ ] Test payments successful
- [ ] Error handling tested

---

## 🐛 TROUBLESHOOTING

### Common Issues:

#### "Invalid API Key":
- Check API key is correct
- Ensure account is verified
- Try regenerating API key

#### "Webhook not receiving":
- Verify HTTPS URL is accessible
- Check firewall/proxy settings
- Test webhook URL manually
- Check NOWPayments IPN logs

#### "Payment not processing":
- Verify IPN secret is correct
- Check signature verification
- Ensure webhook URL is set in NOWPayments dashboard

#### "Currency not supported":
- Check supported currencies list
- Use USDC/USDT for stability

---

## 📈 ADVANCED FEATURES

### Auto-Conversion:
NOWPayments can auto-convert crypto to USD for consistent pricing.

### Multi-Currency Pricing:
Support different pricing for different regions.

### Subscription Management:
Handle recurring payments, upgrades, downgrades.

### Analytics Dashboard:
Track payment performance and conversion rates.

---

## 📞 SUPPORT & RESOURCES

### NOWPayments Support:
- **Email:** support@nowpayments.io
- **Dashboard:** Help center in account
- **API Docs:** https://documenter.getpostman.com/view/7907941/

### Community:
- **Telegram Groups:** Nepal crypto communities
- **Reddit:** r/cryptocurrency
- **Local Meetups:** Kathmandu crypto events

---

## 🎯 QUICK START SUMMARY

1. **Create Account:** https://nowpayments.io/ (1 day)
2. **Get Credentials:** API Key + IPN Secret (1 day)
3. **Configure Environment:** Add to `.env.local` (5 min)
4. **Test Integration:** Small payment test (1 hour)
5. **Go Live:** Start accepting global payments! 🚀

---

## 💡 PRO TIPS

### For Nepal Users:
- **Use USDC** for stable value (no volatility)
- **P2P trading** for fastest cash conversion
- **Global IME Bank** for USD deposits
- **LocalBitcoins** for direct NPR exchange

### For Business:
- **Monitor conversion rates** regularly
- **Offer multiple crypto options** for user choice
- **Set competitive pricing** (factor in 0.5% fees)
- **Provide clear payment instructions**

### For Development:
- **Test thoroughly** before going live
- **Log all transactions** for accounting
- **Implement proper error handling**
- **Monitor webhook delivery** regularly

---

## 🚀 READY TO LAUNCH?

Your DocAI platform is now ready for **global crypto payments**!

**Next Steps:**
1. Set up NOWPayments account
2. Add environment variables
3. Test payment flow
4. Start accepting worldwide payments

**Questions?** The integration is complete and secure. You can start accepting crypto payments immediately! 💰🌍

**Happy selling globally!** 🎉
