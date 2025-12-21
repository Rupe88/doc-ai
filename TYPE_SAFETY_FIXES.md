# Type Safety Fixes - Implementation Guide

## Files Requiring Immediate Type Fixes

### 1. `lib/analyzer/javascript-analyzer.ts`
**Current**: Uses `any` for AST nodes
**Fix**:
```typescript
import type { 
  Node, 
  FunctionDeclaration, 
  ClassDeclaration,
  NodePath 
} from '@babel/types'
import traverse, { type TraverseOptions } from '@babel/traverse'

export class JavaScriptAnalyzer {
  private ast: Node | null
  // ... rest
}
```

### 2. `lib/analyzer/deep-analyzer.ts`
**Current**: `any[]` arrays
**Fix**:
```typescript
private analyzeStructure(): CodeStructure {
  const allFunctions: FunctionInfo[] = []
  const allClasses: ClassInfo[] = []
  const allInterfaces: InterfaceInfo[] = []
  const allTypes: TypeInfo[] = []
  const allExports: ExportInfo[] = []
  // ...
}

private analyzeSecurityAndPerformance() {
  const securityIssues: SecurityIssue[] = []
  const performanceIssues: PerformanceIssue[] = []
  // ...
}

private identifyDataFlow(): DataFlowInfo[] {
  const dataFlow: DataFlowInfo[] = []
  // ...
}
```

### 3. `app/api/generate/route.ts`
**Current**: `jobData: any`
**Fix**:
```typescript
interface GenerationJobData {
  jobId: string
  repoId: string
  owner: string
  repoName: string
  branch: string
  accessToken: string
  options?: DocGenerationOptions
}

export async function processGenerationJob(
  jobData: GenerationJobData
): Promise<void> {
  // ...
}
```

### 4. `components/**/*.tsx`
**Current**: `useState<any>`
**Fix**:
```typescript
// app/(dashboard)/repos/[repoId]/page.tsx
interface Doc {
  id: string
  title: string
  slug: string
  content: string
  type: DocType
  updatedAt: Date
}

const [docs, setDocs] = useState<Doc[]>([])
const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null)

// app/(dashboard)/settings/page.tsx
interface Subscription {
  tier: SubscriptionTier
  status: SubscriptionStatus
  endsAt: Date | null
  customerId: string | null
}

const [subscription, setSubscription] = useState<Subscription | null>(null)
```

### 5. `lib/ai/doc-generator.ts`
**Current**: `any` parameters
**Fix**:
```typescript
async generateFunctionDoc(
  repoId: string,
  functionInfo: FunctionInfo,
  filePath: string
): Promise<string> {
  // Use FunctionInfo type
}

async generateClassDoc(
  repoId: string,
  classInfo: ClassInfo,
  filePath: string
): Promise<string> {
  // Use ClassInfo type
}

private generateArchitectureSection(
  architecture: ArchitectureInfo
): string {
  // Use ArchitectureInfo type
}

private generateSecuritySection(
  issues: SecurityIssue[]
): string {
  // Use SecurityIssue[] type
}

private generatePerformanceSection(
  issues: PerformanceIssue[]
): string {
  // Use PerformanceIssue[] type
}
```

### 6. `lib/queue/job-processor.ts`
**Current**: `data: any`
**Fix**:
```typescript
interface AnalysisJobData {
  jobId: string
  repoId: string
  owner: string
  repoName: string
  branch: string
  accessToken: string
}

interface DocGenerationJobData extends AnalysisJobData {
  options?: DocGenerationOptions
}

interface SyncJobData extends AnalysisJobData {
  commitSha?: string
}

type JobData = AnalysisJobData | DocGenerationJobData | SyncJobData

export interface Job {
  id: string
  type: 'analysis' | 'doc_generation' | 'sync'
  data: JobData
  priority: number
  attempts: number
  maxAttempts: number
}
```

### 7. `lib/ai/chat-service.ts`
**Current**: `as any[]`
**Fix**:
```typescript
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const messages = (session.messages as ChatMessage[]) || []
const conversationHistory: ChatMessage[] = messages.map(m => ({
  role: m.role,
  content: m.content,
}))
```

### 8. `lib/ai/vector-store.ts`
**Current**: `payload: any`
**Fix**:
```typescript
interface VectorMetadata {
  repoId: string
  filePath: string
  lineStart?: number
  functionName?: string
  [key: string]: unknown
}

interface VectorSearchResult {
  id: string
  score: number
  payload: {
    content: string
  } & VectorMetadata
}

async search(
  collectionName: string,
  query: string,
  limit: number = 5,
  filter?: Record<string, string | number>
): Promise<VectorSearchResult[]> {
  // ...
}
```

### 9. `lib/paddle/client.ts`
**Current**: `passthrough?: Record<string, any>`
**Fix**:
```typescript
interface PaddlePassthrough {
  userId: string
  tier: SubscriptionTier
  [key: string]: string | number | boolean
}

export interface PaddleCheckoutOptions {
  productId: string
  customerId?: string
  email?: string
  successUrl: string
  passthrough?: PaddlePassthrough
}
```

### 10. `components/docs/DocViewer.tsx`
**Current**: `props: any`
**Fix**:
```typescript
import type { Components } from 'react-markdown'

const components: Partial<Components> = {
  code: ({ node, inline, className, children, ...props }) => {
    // Properly typed
  },
}
```

## TypeScript Configuration Enhancements

### Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Run Type Check

Add to `package.json`:
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch"
  }
}
```

Run: `npm run type-check`

