/**
 * AI Code Generation API
 * Generate code using codebase context and patterns
 */

import { NextRequest } from 'next/server'
import { getCodeGenerator } from '@/lib/ai/code-generator'
import { createApiHandler, requireUser } from '@/lib/utils/api-wrapper'
import { successResponse } from '@/lib/utils/error-handler'
import { z } from 'zod'

const codeGenSchema = z.object({
  type: z.enum(['function', 'class', 'component', 'api', 'test', 'service']),
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(500),
  requirements: z.array(z.string()).optional(),
  repoId: z.string().cuid(),
  language: z.string().optional(),
  framework: z.string().optional(),
})

export const POST = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const requestData = await context.request.json()
    const data = codeGenSchema.parse(requestData)

    const codeGenerator = getCodeGenerator()

    const result = await codeGenerator.generateCode({
      ...data,
      language: data.language || 'typescript',
      framework: data.framework || 'nextjs',
    })

    return successResponse({
      generated: result,
      type: data.type,
      name: data.name,
    })
  },
  { requireAuth: true, methods: ['POST'] }
)

// Generate tests for existing code
const testGenSchema = z.object({
  code: z.string().min(1),
  language: z.string(),
  repoId: z.string().cuid(),
})

export const PUT = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const requestData = await context.request.json()
    const { code, language, repoId } = testGenSchema.parse(requestData)

    const codeGenerator = getCodeGenerator()
    const tests = await codeGenerator.generateTests(code, language, repoId)

    return successResponse({
      tests,
      language,
    })
  },
  { requireAuth: true, methods: ['PUT'] }
)
