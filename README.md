# AI Codebase Documentation Generator SaaS

A comprehensive SaaS platform that automatically generates and maintains documentation for codebases using deep code analysis, AI-powered RAG, and vector search.

## Features

- **Deep Code Analysis**: Multi-level analysis including structural, semantic, dependency, security, and architecture insights
- **AI-Powered Documentation**: Automatically generate comprehensive markdown documentation
- **Interactive Chat**: Ask questions about your codebase with RAG-powered responses
- **GitHub Integration**: Connect repositories and auto-sync on code changes
- **Payment Integration**: Paddle integration for subscription management
- **Scalable Architecture**: Built with Next.js 14, Supabase, Qdrant, and Upstash Redis

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + Auth)
- **AI**: LangChain, OpenAI GPT-4, Qdrant (Vector DB), @xenova/transformers
- **Code Analysis**: TypeScript Compiler API, Babel Parser, tree-sitter, madge
- **Infrastructure**: Vercel, Upstash Redis, Qdrant Cloud

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Configure your environment variables in `.env.local`

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

## Environment Variables

See `.env.example` for all required environment variables.

## Project Structure

- `app/` - Next.js app directory with routes and API endpoints
- `components/` - React components (UI, dashboard, docs, chat)
- `lib/` - Core libraries (AI, analyzer, GitHub, Paddle, cache, etc.)
- `prisma/` - Database schema
- `types/` - TypeScript type definitions

## License

MIT

# doc-ai
