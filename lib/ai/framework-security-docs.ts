/**
 * Framework-Specific Security Documentation
 *
 * Comprehensive security patterns for React, Next.js, Vue, Express, and more
 */

export const FRAMEWORK_SECURITY_PATTERNS = {
  react: {
    name: 'React',
    patterns: [
      {
        name: 'dangerouslySetInnerHTML XSS',
        severity: 'CRITICAL',
        example: 'BAD: <div dangerouslySetInnerHTML={{__html: userInput}} />',
        fix: 'GOOD: <div>{DOMPurify.sanitize(userInput)}</div>',
        cwe: 'CWE-79'
      },
      {
        name: 'useEffect Stale Closures',
        severity: 'MEDIUM',
        example: 'useEffect(() => { console.log(userInput) }, [])',
        fix: 'useEffect(() => { console.log(userInput) }, [userInput])',
        cwe: 'CWE-664'
      },
      {
        name: 'setState XSS',
        severity: 'HIGH',
        example: 'setState({ content: `<script>${userInput}</script>` })',
        fix: 'setState({ content: sanitize(userInput) })',
        cwe: 'CWE-79'
      }
    ]
  },

  nextjs: {
    name: 'Next.js',
    patterns: [
      {
        name: 'API Route Injection',
        severity: 'HIGH',
        example: 'const { id } = req.query; sql`SELECT * FROM users WHERE id = ${id}`',
        fix: 'const schema = z.object({ id: z.string().uuid() }); const { id } = schema.parse(req.query)',
        cwe: 'CWE-94'
      },
      {
        name: 'Server-Side Request Forgery',
        severity: 'HIGH',
        example: 'fetch(`https://${userInput}.api.com/data`)',
        fix: 'const allowedHosts = ["api.trusted.com"]; if (!allowedHosts.includes(host)) throw new Error("Invalid host")',
        cwe: 'CWE-918'
      },
      {
        name: 'Image Domain Bypass',
        severity: 'HIGH',
        example: 'images: { domains: ["*"] }',
        fix: 'images: { domains: ["cdn.trusted.com", "images.trusted.com"] }',
        cwe: 'CWE-918'
      }
    ]
  },

  vue: {
    name: 'Vue.js',
    patterns: [
      {
        name: 'v-html XSS',
        severity: 'CRITICAL',
        example: '<div v-html="userInput"></div>',
        fix: '<div v-text="sanitize(userInput)"></div>',
        cwe: 'CWE-79'
      },
      {
        name: 'Computed Property Injection',
        severity: 'MEDIUM',
        example: 'computed: { dangerous() { return `<script>${this.userInput}</script>` } }',
        fix: 'computed: { safe() { return DOMPurify.sanitize(this.userInput) } }',
        cwe: 'CWE-95'
      },
      {
        name: 'Deep Watcher Injection',
        severity: 'MEDIUM',
        example: 'watch: { userInput: { deep: true, handler: eval(userInput) } }',
        fix: 'watch: { userInput: { handler: (val) => this.safeHandler(val) } }',
        cwe: 'CWE-95'
      }
    ]
  },

  express: {
    name: 'Express.js',
    patterns: [
      {
        name: 'Path Traversal',
        severity: 'CRITICAL',
        example: 'res.sendFile(path.join(__dirname, req.params.filename))',
        fix: 'const safePath = path.normalize(req.params.filename); if (!safePath.startsWith(allowedDir)) return; res.sendFile(safePath)',
        cwe: 'CWE-22'
      },
      {
        name: 'CORS Misconfiguration',
        severity: 'HIGH',
        example: 'app.use(cors({ origin: "*" }))',
        fix: 'app.use(cors({ origin: ["https://trusteddomain.com"] }))',
        cwe: 'CWE-942'
      },
      {
        name: 'Missing Security Headers',
        severity: 'MEDIUM',
        example: 'app.listen(3000)',
        fix: 'app.use(helmet()); app.listen(3000)',
        cwe: 'CWE-693'
      },
      {
        name: 'Rate Limiting Missing',
        severity: 'MEDIUM',
        example: 'app.post("/api/login", (req, res) => { /* no rate limit */ })',
        fix: 'const rateLimit = require("express-rate-limit"); app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))',
        cwe: 'CWE-770'
      }
    ]
  },

  auth: {
    name: 'Authentication & Authorization',
    patterns: [
      {
        name: 'Hardcoded JWT Secret',
        severity: 'CRITICAL',
        example: 'const JWT_SECRET = "my-secret-key-12345"',
        fix: 'const JWT_SECRET = process.env.JWT_SECRET',
        cwe: 'CWE-798'
      },
      {
        name: 'Weak Password Requirements',
        severity: 'HIGH',
        example: 'if (password.length < 4) { /* accept weak password */ }',
        fix: 'const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$/',
        cwe: 'CWE-521'
      },
      {
        name: 'Plain Text Password Storage',
        severity: 'CRITICAL',
        example: 'user.password = req.body.password; await user.save()',
        fix: 'user.passwordHash = await bcrypt.hash(req.body.password, 12); await user.save()',
        cwe: 'CWE-257'
      }
    ]
  }
}

export const SECURITY_RECOMMENDATIONS = {
  react: [
    'Use DOMPurify for any HTML rendering',
    'Implement proper useEffect dependencies',
    'Validate all props with PropTypes or TypeScript',
    'Use React Helmet for security headers',
    'Implement Content Security Policy'
  ],

  nextjs: [
    'Validate all API route inputs with Zod/Joi',
    'Configure image domains explicitly',
    'Use NextAuth.js for authentication',
    'Implement proper middleware for auth',
    'Use environment variables for secrets'
  ],

  vue: [
    'Avoid v-html when possible',
    'Use computed properties safely',
    'Implement Vue 3 Composition API securely',
    'Use Vue Router guards for auth',
    'Sanitize all dynamic content'
  ],

  express: [
    'Install and configure Helmet',
    'Implement rate limiting on all routes',
    'Use CORS with specific origins',
    'Validate all inputs with middleware',
    'Use secure session configuration'
  ],

  general: [
    'Implement HTTPS everywhere',
    'Use environment variables for secrets',
    'Implement proper error handling',
    'Regular security audits and updates',
    'Monitor for security vulnerabilities'
  ]
}

export function getFrameworkSecurityGuide(framework: string) {
  const patterns = FRAMEWORK_SECURITY_PATTERNS[framework as keyof typeof FRAMEWORK_SECURITY_PATTERNS]
  const recommendations = SECURITY_RECOMMENDATIONS[framework as keyof typeof SECURITY_RECOMMENDATIONS] ||
                         SECURITY_RECOMMENDATIONS.general

  if (!patterns) {
    return {
      framework: 'Unknown',
      patterns: [],
      recommendations: SECURITY_RECOMMENDATIONS.general
    }
  }

  return {
    framework: patterns.name,
    patterns: patterns.patterns,
    recommendations
  }
}
