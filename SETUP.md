# 🚀 Setup & Run Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (via Supabase)
- GitHub account (for OAuth)
- OpenAI API key (for AI features)
- Qdrant account (for vector database) - Optional (can use local)
- Upstash Redis account (for caching/queue) - Optional (can use local)
- Paddle account (for payments) - Optional for development

## Step 1: Install Dependencies

```bash
cd /home/rupesh/workspace/ai-saas
npm install
```

## Step 2: Set Up Environment Variables

1. Copy the template:
```bash
cp env.local.template .env.local
```

2. Edit `.env.local` and fill in your values:

### Required for Basic Functionality:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# GitHub OAuth (Required)
GITHUB_CLIENT_ID=[YOUR-CLIENT-ID]
GITHUB_CLIENT_SECRET=[YOUR-CLIENT-SECRET]
GITHUB_WEBHOOK_SECRET=[GENERATE-RANDOM-STRING]

# OpenAI (Required for AI features)
OPENAI_API_KEY=[YOUR-OPENAI-KEY]

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Encryption Secret (generate random string)
ENCRYPTION_SECRET=[GENERATE-WITH: openssl rand -base64 32]
```

### Optional (Can use defaults for development):

```env
# Qdrant (Vector DB) - Can use local Docker instance
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Upstash Redis - Can use local Redis
UPSTASH_REDIS_REST_URL=http://localhost:6379
UPSTASH_REDIS_REST_TOKEN=

# Paddle (Payments) - Only needed for payment features
PADDLE_API_KEY=
PADDLE_SANDBOX_API_KEY=
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
PADDLE_WEBHOOK_SECRET=
```

## Step 3: Set Up Supabase Database

1. Go to https://supabase.com and create a free account
2. Create a new project
3. Go to Settings → Database → Connection string
4. Copy the connection string to `DATABASE_URL` and `DIRECT_URL`
5. Go to Settings → API
6. Copy `URL` to `NEXT_PUBLIC_SUPABASE_URL`
7. Copy `anon public` key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
8. Copy `service_role` key to `SUPABASE_SERVICE_ROLE_KEY`

## Step 4: Set Up GitHub OAuth

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Application name: "AI Codebase Docs"
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/github`
4. Copy Client ID and Client Secret to `.env.local`
5. Generate a webhook secret: `openssl rand -hex 20`

## Step 5: Set Up Database Schema

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

Or run migrations:
```bash
npm run db:migrate
```

## Step 6: Set Up Optional Services

### Option A: Use Local Services (Easier for Development)

#### Local Qdrant (Vector Database):
```bash
docker run -p 6333:6333 qdrant/qdrant
```
Then set in `.env.local`:
```env
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
```

#### Local Redis:
```bash
docker run -p 6379:6379 redis:alpine
```
Or install Redis locally and set:
```env
UPSTASH_REDIS_REST_URL=http://localhost:6379
UPSTASH_REDIS_REST_TOKEN=
```

### Option B: Use Cloud Services (Production-like)

#### Qdrant Cloud:
1. Sign up at https://cloud.qdrant.io
2. Create a free cluster
3. Copy URL and API key to `.env.local`

#### Upstash Redis:
1. Sign up at https://upstash.com
2. Create a Redis database
3. Copy REST URL and token to `.env.local`

## Step 7: Run the Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

## Step 8: Verify Setup

1. Open http://localhost:3000
2. Click "Connect GitHub" or go to `/api/github/connect`
3. Authorize the app
4. You should be redirected to dashboard

## Troubleshooting

### Database Connection Issues
```bash
# Test database connection
npm run db:studio
# This opens Prisma Studio - if it works, DB is connected
```

### Type Errors
```bash
# Check for type errors
npm run type-check
```

### Missing Dependencies
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or change port in package.json
```

### Environment Variables Not Loading
- Make sure `.env.local` exists in project root
- Restart the dev server after changing `.env.local`
- Check that variable names match exactly (case-sensitive)

## Quick Start (Minimal Setup)

For quick testing without all services:

1. **Minimum Required**:
   - Supabase (database)
   - GitHub OAuth
   - OpenAI API key

2. **Set minimal `.env.local`**:
```env
DATABASE_URL=[SUPABASE-URL]
DIRECT_URL=[SUPABASE-URL]
NEXT_PUBLIC_SUPABASE_URL=[SUPABASE-URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[SUPABASE-KEY]
SUPABASE_SERVICE_ROLE_KEY=[SUPABASE-KEY]
GITHUB_CLIENT_ID=[GITHUB-ID]
GITHUB_CLIENT_SECRET=[GITHUB-SECRET]
GITHUB_WEBHOOK_SECRET=[RANDOM-STRING]
OPENAI_API_KEY=[OPENAI-KEY]
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_SECRET=[RANDOM-STRING]
```

3. **Run**:
```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

## Production Deployment

### Deploy to Vercel:

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production:

- Use production URLs for all services
- Set `NEXT_PUBLIC_APP_URL` to your domain
- Use production Paddle keys
- Use production Qdrant cluster
- Use production Redis

## Next Steps After Running

1. **Connect GitHub**: Authorize the app
2. **Select a Repository**: Choose a repo to document
3. **Generate Docs**: Click "Generate" (note: jobs won't process without worker)
4. **View Docs**: Once generated, view documentation
5. **Chat**: Ask questions about your codebase

## Important Notes

⚠️ **Jobs won't process automatically** - You need to set up a job worker (see `IMPLEMENTATION_STATUS.md`)

⚠️ **Authentication is placeholder** - Currently using `x-user-id` header (needs real auth)

⚠️ **Some features require additional setup** - See `IMPLEMENTATION_STATUS.md` for details

