# DocAI - Enterprise-Grade AI Documentation Platform

<div align="center">
  <div style="display: inline-flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #3B82F6, #1E40AF); padding: 16px 24px; border-radius: 12px; margin-bottom: 20px;">
    <div style="width: 32px; height: 32px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #1E40AF;">AI</div>
    <span style="font-size: 24px; font-weight: bold; color: white;">DocAI</span>
  </div>
</div>

<div align="center">
  <h3>Transform Your Development Workflow with AI-Powered Documentation</h3>
  <p>DocAI reads every file in your codebase and generates comprehensive documentation in under a minute using advanced AI and RAG technology.</p>

  <div style="display: flex; gap: 8px; justify-content: center; margin-top: 16px;">
    <img src="https://img.shields.io/badge/Next.js-14.0-black" alt="Next.js"/>
    <img src="https://img.shields.io/badge/TypeScript-5.3-blue" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/LangChain-0.1-green" alt="LangChain"/>
    <img src="https://img.shields.io/badge/Qdrant-Vector_DB-purple" alt="Qdrant"/>
    <img src="https://img.shields.io/badge/Prisma-ORM-blue" alt="Prisma"/>
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-cyan" alt="Tailwind CSS"/>
  </div>
</div>

## ✨ Features

### 🚀 Core AI Features
- **Instant Documentation Generation** - Create comprehensive docs in 56 seconds
- **Deep AI Understanding** - AI reads EVERY file, function, class, route, service, and model
- **Conversational Code Intelligence** - Chat with your codebase using RAG-powered search
- **Multi-Provider AI Integration** - Support for OpenAI, Google Gemini, Groq, and Together AI
- **Advanced RAG Engine** - Context-aware code search and retrieval
- **Custom AI Model Fine-tuning** - Enterprise-grade AI customization

### 🔒 Security & Analysis
- **Advanced Security Scanning** - 16+ pattern detection for vulnerabilities
- **Real-time Security Monitoring** - Continuous codebase security analysis
- **Code Quality Metrics** - Complexity analysis, tech debt tracking, maintainability scores
- **Dependency Analysis** - Visualize imports, detect circular dependencies, identify orphan files
- **API Auto-Documentation** - OpenAPI spec generation for all endpoints
- **Framework Security Docs** - Specialized security documentation for major frameworks

### 🔧 Developer Experience
- **GitHub Integration** - Seamless repository connection and webhook automation
- **Real-time Collaborative Editing** - Team collaboration on documentation
- **Performance Profiling** - Code execution analysis and optimization
- **Code Execution Sandbox** - Safe code testing environment
- **Advanced Analytics** - Code churn tracking and development insights
- **Version Control** - Document versioning and history tracking

### 🎨 Modern UI/UX
- **Glass Morphism Design** - Modern, professional interface
- **Winter Theme** - Seasonal design with animated snow effects
- **Responsive Design** - Optimized for all devices
- **Interactive Demo** - Live documentation generation showcase
- **Dark Mode First** - Developer-friendly dark theme

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript 5.3** - Type-safe development
- **Tailwind CSS 3.4** - Utility-first styling
- **Framer Motion** - Smooth animations and transitions
- **Radix UI** - Accessible component primitives

### Backend & AI
- **LangChain** - LLM application framework
  - `@langchain/community` - Community integrations
  - `@langchain/google-genai` - Google Gemini integration
  - `@langchain/groq` - Groq API integration
  - `@langchain/openai` - OpenAI integration
- **Qdrant** - Vector database for RAG
- **Voyage AI** - High-quality embeddings
- **Transformers.js** - Client-side AI processing

### Database & Caching
- **Prisma ORM** - Type-safe database access
- **Supabase** - Real-time database and authentication
- **Redis** - High-performance caching (Upstash)
- **PostgreSQL** - Primary database

### Integrations & APIs
- **GitHub API** - Repository integration and webhooks
- **Paddle** - Subscription and payment processing
- **Octokit** - GitHub REST API client
- **Tree-sitter** - Advanced code parsing

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Prisma Studio** - Database management GUI

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x
- PostgreSQL database
- Redis instance (optional, uses Upstash by default)
- GitHub OAuth App (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/docai.git
   cd docai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Configure the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/docai"

   # AI Providers
   OPENAI_API_KEY="your_openai_key"
   GOOGLE_AI_API_KEY="your_gemini_key"
   GROQ_API_KEY="your_groq_key"

   # GitHub Integration
   GITHUB_CLIENT_ID="your_github_client_id"
   GITHUB_CLIENT_SECRET="your_github_client_secret"

   # Payments (Paddle)
   PADDLE_API_KEY="your_paddle_key"
   PADDLE_ENVIRONMENT="sandbox"

   # Vector Database (Qdrant)
   QDRANT_URL="your_qdrant_url"
   QDRANT_API_KEY="your_qdrant_key"

   # Redis (optional)
   REDIS_URL="your_redis_url"
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
docai/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   ├── demo/              # Interactive demo page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── aceternity/       # Animation components
│   └── docs/             # Documentation components
├── lib/                   # Business logic
│   ├── ai/               # AI services and RAG
│   ├── analyzer/         # Code analysis engines
│   ├── github/           # GitHub integration
│   ├── security/         # Security scanners
│   └── utils/            # Helper utilities
├── prisma/               # Database schema
├── scripts/              # Development scripts
└── types/                # TypeScript definitions
```

## 🎯 Key Components

### AI & RAG Engine
- **Multi-provider LLM support** with automatic fallback
- **Advanced embeddings** using Voyage AI
- **Context-aware retrieval** for accurate code search
- **Conversational memory** for better interactions

### Code Analysis Pipeline
- **47+ analysis types** covering all major frameworks
- **Real-time security scanning** with 16+ vulnerability patterns
- **Dependency graph generation** with circular dependency detection
- **Performance profiling** and optimization suggestions

### Documentation Generation
- **Multi-format output** (Markdown, HTML, JSON)
- **OpenAPI specification** generation
- **Framework-specific templates** for different tech stacks
- **Version control integration** for documentation history

## 🔐 Security Features

- **Advanced vulnerability scanning** for SQL injection, XSS, CSRF
- **Dependency security analysis** with known vulnerability detection
- **Code execution sandbox** for safe testing
- **Encrypted data storage** with AES-256 encryption
- **Rate limiting** and DDoS protection
- **Audit logging** for all sensitive operations

## 📊 Analytics & Insights

- **Code quality metrics** with maintainability scores
- **Developer productivity tracking** with time-to-completion metrics
- **Repository health monitoring** with automated alerts
- **Performance benchmarking** against industry standards
- **Custom dashboards** with real-time data visualization

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with one click

### Docker
```bash
# Build the image
docker build -t docai .

# Run with environment variables
docker run -p 3000:3000 --env-file .env.local docai
```

### Manual Deployment
1. Build the application: `npm run build`
2. Start production server: `npm start`
3. Set up reverse proxy (nginx recommended)
4. Configure SSL certificates

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LangChain** for the powerful LLM application framework
- **Vercel** for the exceptional deployment platform
- **Qdrant** for the high-performance vector database
- **Prisma** for the amazing ORM experience
- **Tailwind CSS** for the utility-first styling approach

## 📞 Support

- **Documentation**: [docs.docai.com](https://docs.docai.com)
- **Discord Community**: [discord.gg/docai](https://discord.gg/docai)
- **Twitter**: [@DocAI_Official](https://twitter.com/DocAI_Official)
- **Email**: support@docai.com

---

<div align="center">
  <p><strong>Built with ❤️ by Rupesh Chaudhary</strong></p>
  <p><em>Transforming documentation with the power of AI</em></p>
  <p>© 2026 DocAI. All rights reserved.</p>
</div>
