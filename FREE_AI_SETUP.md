# 🆓 Free AI Providers Setup Guide

## 🎯 Overview

Your app now supports **multiple FREE AI providers** instead of just OpenAI! Choose the one that works best for you.

---

## 🚀 Recommended: Groq (FASTEST & FREE!)

### Why Groq?
- ⚡ **Super fast** - Fastest inference speeds
- 🆓 **Free tier** - Very generous limits
- 🧠 **Powerful models** - Llama 3.1 70B, Mixtral, etc.
- ✅ **Best for code documentation**

### Setup:
1. **Get API Key**: https://console.groq.com/
2. **Add to `.env.local`**:
   ```env
   GROQ_API_KEY=your-groq-api-key
   AI_PROVIDER=groq
   ```

### Models Available:
- `llama-3.1-70b-versatile` (default) - Best quality
- `llama-3.1-8b-instant` - Faster, smaller
- `mixtral-8x7b-32768` - Good balance

---

## 🌟 Google Gemini (FREE!)

### Why Gemini?
- 🆓 **Free tier** - 60 requests/minute
- 🧠 **Very capable** - Great for code analysis
- 📊 **Good for documentation**

### Setup:
1. **Get API Key**: https://makersuite.google.com/app/apikey
2. **Install package**:
   ```bash
   npm install @langchain/google-genai
   ```
3. **Add to `.env.local`**:
   ```env
   GEMINI_API_KEY=your-gemini-api-key
   AI_PROVIDER=gemini
   ```

### Models Available:
- `gemini-pro` (default)
- `gemini-pro-vision` (for images)

---

## 🔥 Together AI (FREE CREDITS!)

### Why Together?
- 💰 **$25 free credits** - Great to start
- 🧠 **Open models** - Llama 2, Mistral, etc.
- 🔄 **OpenAI-compatible** - Easy migration

### Setup:
1. **Get API Key**: https://api.together.xyz/
2. **Add to `.env.local`**:
   ```env
   TOGETHER_API_KEY=your-together-api-key
   AI_PROVIDER=together
   ```

### Models Available:
- `mistralai/Mixtral-8x7B-Instruct-v0.1` (default)
- `meta-llama/Llama-2-70b-chat-hf`
- `togethercomputer/llama-2-7b-chat`

---

## 📦 Installation

### For Groq:
```bash
npm install @langchain/groq
```

### For Gemini:
```bash
npm install @langchain/google-genai
```

### For Together:
No extra package needed! Uses OpenAI-compatible API.

---

## ⚙️ Configuration

### Auto-Detection (Recommended)
The app automatically detects which API keys you have and uses them in priority order:
1. Groq (if `GROQ_API_KEY` set)
2. Gemini (if `GEMINI_API_KEY` set)
3. Together (if `TOGETHER_API_KEY` set)
4. OpenAI (if `OPENAI_API_KEY` set)

### Manual Selection
Set `AI_PROVIDER` in `.env.local`:
```env
AI_PROVIDER=groq  # or gemini, together, openai
```

---

## 📝 Complete `.env.local` Example

```env
# Choose ONE provider (or let auto-detection work)

# Option 1: Groq (Recommended - Fastest & Free)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.1-70b-versatile

# Option 2: Gemini (Free tier)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-pro

# Option 3: Together AI ($25 free credits)
TOGETHER_API_KEY=your-together-api-key
TOGETHER_MODEL=mistralai/Mixtral-8x7B-Instruct-v0.1

# Option 4: OpenAI (Paid)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview

# Auto-select provider (optional)
AI_PROVIDER=groq
```

---

## 🎯 Which Provider Should I Use?

### For Speed: **Groq** ⚡
- Fastest inference
- Best for real-time chat
- Free tier is generous

### For Quality: **Gemini** 🌟
- Very capable models
- Good for complex documentation
- Free tier: 60 req/min

### For Credits: **Together** 💰
- $25 free credits
- Multiple model options
- Good for testing

### For Production: **OpenAI** (if budget allows)
- Most reliable
- Best quality
- Paid service

---

## 🔄 Switching Providers

Just change the API key in `.env.local`:
```env
# Switch from OpenAI to Groq
# Comment out OPENAI_API_KEY
# OPENAI_API_KEY=...

# Add Groq
GROQ_API_KEY=your-new-key
```

Restart your dev server and it will auto-detect!

---

## 🐛 Troubleshooting

### Error: "No AI provider API key found"
**Fix**: Set at least one API key:
- `GROQ_API_KEY` (recommended)
- `GEMINI_API_KEY`
- `TOGETHER_API_KEY`
- `OPENAI_API_KEY`

### Error: "Install @langchain/groq"
**Fix**: 
```bash
npm install @langchain/groq
```

### Error: "Install @langchain/google-genai"
**Fix**:
```bash
npm install @langchain/google-genai
```

### Provider not working?
1. Check API key is correct
2. Check API key has credits/quota
3. Try a different provider
4. Check logs for specific error

---

## 💡 Tips

1. **Start with Groq** - Fastest and easiest to set up
2. **Use Gemini** for complex documentation tasks
3. **Use Together** if you need specific models
4. **Keep OpenAI** as fallback for production

---

## ✅ Quick Start

1. **Get Groq API key**: https://console.groq.com/
2. **Add to `.env.local`**:
   ```env
   GROQ_API_KEY=your-key-here
   ```
3. **Restart dev server**
4. **Done!** 🎉

Your app now uses free AI! No OpenAI needed! 🚀

