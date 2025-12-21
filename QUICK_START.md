# ⚡ Quick Start Guide

## 🚀 Run in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Database
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (make sure DATABASE_URL is set in .env.local)
npm run db:push
```

### Step 3: Start Development Server
```bash
npm run dev
```

**Open**: http://localhost:3000

---

## 📋 Prerequisites Checklist

Before running, make sure you have:

- [ ] **Supabase Account** - Free at https://supabase.com
  - Create project
  - Get database URL and API keys
  - Add to `.env.local`

- [ ] **GitHub OAuth App** - Free
  - Go to https://github.com/settings/developers
  - Create OAuth App
  - Set callback: `http://localhost:3000/api/auth/github`
  - Add Client ID/Secret to `.env.local`

- [ ] **OpenAI API Key** - Paid (but cheap)
  - Get from https://platform.openai.com/api-keys
  - Add to `.env.local`

- [ ] **Optional Services** (can use local Docker):
  - Qdrant (vector DB): `docker run -p 6333:6333 qdrant/qdrant`
  - Redis: `docker run -p 6379:6379 redis:alpine`

---

## 🔧 Minimal .env.local Setup

```env
# Database (Required)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-KEY]

# GitHub (Required)
GITHUB_CLIENT_ID=[YOUR-ID]
GITHUB_CLIENT_SECRET=[YOUR-SECRET]
GITHUB_WEBHOOK_SECRET=any-random-string-here

# OpenAI (Required for AI)
OPENAI_API_KEY=sk-[YOUR-KEY]

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_SECRET=generate-with-openssl-rand-base64-32

# Optional - Use local Docker if not set
QDRANT_URL=http://localhost:6333
UPSTASH_REDIS_REST_URL=http://localhost:6379
```

---

## ✅ Verify It's Working

1. **Check TypeScript**:
```bash
npm run type-check
```

2. **Check Database**:
```bash
npm run db:studio
# Opens Prisma Studio - if it works, DB is connected
```

3. **Start Server**:
```bash
npm run dev
```

4. **Test in Browser**:
   - Go to http://localhost:3000
   - Click "Connect GitHub"
   - Authorize
   - Should redirect to dashboard

---

## 🐛 Common Issues

### "Cannot find module"
```bash
npm install
```

### "Database connection failed"
- Check `DATABASE_URL` in `.env.local`
- Make sure Supabase project is active
- Test connection: `npm run db:studio`

### "Port 3000 already in use"
```bash
# Kill process
lsof -ti:3000 | xargs kill -9
# Or use different port
PORT=3001 npm run dev
```

### "Prisma Client not generated"
```bash
npm run db:generate
```

### "Environment variables not loading"
- Make sure file is named `.env.local` (not `.env`)
- Restart dev server after changes
- Check variable names are exact (case-sensitive)

---

## 📚 Next Steps

1. **Connect GitHub** - Authorize the app
2. **Select Repository** - Choose a repo to document
3. **Generate Docs** - Click generate (note: needs job worker for processing)
4. **View Documentation** - Browse generated docs
5. **Chat** - Ask questions about codebase

---

## 🚨 Important Notes

⚠️ **Jobs won't auto-process** - Background jobs need a worker (see `IMPLEMENTATION_STATUS.md`)

⚠️ **Auth is placeholder** - Currently using headers (needs real auth middleware)

⚠️ **Some features need setup** - See full `SETUP.md` for complete configuration

---

## 🎯 Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # Check TypeScript types
```

---

## 📖 Full Documentation

- `SETUP.md` - Complete setup guide
- `IMPLEMENTATION_STATUS.md` - What's implemented
- `ENHANCEMENTS.md` - Future improvements
- `README.md` - Project overview

