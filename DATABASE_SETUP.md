# 🗄️ Database Setup Guide

## ✅ Database Tables Created!

Your database schema has been successfully pushed to your PostgreSQL database.

---

## 📋 What Was Created

The following tables are now in your database:

- ✅ **User** - User accounts and authentication
- ✅ **Session** - User sessions
- ✅ **Repo** - GitHub repositories
- ✅ **CodeIndex** - Code indexing for search
- ✅ **Doc** - Generated documentation
- ✅ **DocVersion** - Documentation version history
- ✅ **VectorChunk** - Vector embeddings for RAG
- ✅ **ChatSession** - Chat conversation history
- ✅ **AnalysisJob** - Background analysis jobs

---

## 🔧 Setup Commands

### Initial Setup (Already Done ✅)
```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
export $(grep -v '^#' .env.local | xargs)
npx prisma db push
```

### For Future Schema Changes

**Option 1: Development (Recommended)**
```bash
# Create a migration
export $(grep -v '^#' .env.local | xargs)
npx prisma migrate dev --name your_migration_name
```

**Option 2: Quick Push (Development Only)**
```bash
# Push changes directly (no migration history)
export $(grep -v '^#' .env.local | xargs)
npx prisma db push
```

---

## 🔍 Verify Database Connection

### Check Tables Exist
```bash
export $(grep -v '^#' .env.local | xargs)
npx prisma studio
```

This opens Prisma Studio where you can:
- View all tables
- Browse data
- Edit records
- Verify schema

### Or Use SQL
```bash
export $(grep -v '^#' .env.local | xargs)
npx prisma db execute --stdin
# Then run: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

---

## ⚠️ Important Notes

### Environment Variables

Make sure `.env.local` has:
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

**Why both?**
- `DATABASE_URL` - Used by Prisma Client (can use connection pooling)
- `DIRECT_URL` - Used by Prisma Migrate (needs direct connection)

For Supabase:
- `DATABASE_URL` - Use port `6543` (pgBouncer connection pooler)
- `DIRECT_URL` - Use port `5432` (direct connection)

### Loading Environment Variables

**For Prisma CLI commands**, you need to load `.env.local`:
```bash
export $(grep -v '^#' .env.local | xargs)
npx prisma [command]
```

**Or use dotenv-cli** (install first: `npm install -g dotenv-cli`):
```bash
dotenv -e .env.local -- npx prisma [command]
```

---

## 🐛 Troubleshooting

### Error: "Environment variable not found: DIRECT_URL"
**Fix**: Make sure `.env.local` has `DIRECT_URL` set, then:
```bash
export $(grep -v '^#' .env.local | xargs)
npx prisma db push
```

### Error: "The table does not exist"
**Fix**: Run database push:
```bash
export $(grep -v '^#' .env.local | xargs)
npx prisma db push
npx prisma generate
```

### Error: "Connection refused"
**Fix**: 
- Check `DATABASE_URL` and `DIRECT_URL` in `.env.local`
- Verify database is accessible
- Check firewall/network settings

---

## 🚀 Next Steps

1. ✅ Database tables created
2. ✅ Prisma Client generated
3. ✅ Ready to use!

**Test the authentication flow:**
- Click "Login" or "Get Started"
- GitHub OAuth should work now
- User will be created in database

---

## 📚 Useful Commands

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Push schema changes
export $(grep -v '^#' .env.local | xargs)
npx prisma db push

# Create migration
export $(grep -v '^#' .env.local | xargs)
npx prisma migrate dev --name migration_name

# Open database GUI
export $(grep -v '^#' .env.local | xargs)
npx prisma studio

# Reset database (⚠️ DANGER: Deletes all data)
export $(grep -v '^#' .env.local | xargs)
npx prisma migrate reset
```

---

## ✅ Status

- ✅ Database schema created
- ✅ All tables exist
- ✅ Prisma Client generated
- ✅ Ready for authentication!

Your database is now ready! 🎉

