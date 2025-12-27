/**
 * Repository Status API - Check indexing and RAG status
 * Helps users understand why chat might not be working
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getRAGEngine } from '@/lib/ai/rag-engine';
import { createApiHandler, requireUser } from '@/lib/utils/api-wrapper';
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler';

export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context);
    const repoId = context.params?.repoId;

    if (!repoId) {
      throw new Error('Repository ID is required');
    }

    // Verify repo access
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: {
        id: true,
        fullName: true,
        userId: true,
        docs: {
          select: { id: true, type: true },
          take: 10,
        },
      },
    });

    if (!repo) throw new NotFoundError('Repository');
    checkResourceAccess(user.id, repo.userId, 'Repository');

    // Check RAG indexing status
    const rag = getRAGEngine();
    const ragAvailable = await rag.isAvailable(repoId);

    // Get document counts
    const totalDocs = repo.docs.length;
    const docsByType = repo.docs.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Check for recent analysis
    const recentAnalysis = await prisma.analysisJob.findFirst({
      where: {
        repoId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });

    const status = {
      repository: {
        id: repoId,
        name: repo.fullName,
        indexed: ragAvailable,
        lastAnalyzed: recentAnalysis?.completedAt || null,
        hasAnalysis: !!recentAnalysis,
      },
      documentation: {
        totalDocs,
        docsByType,
        hasAPIDocs: docsByType.api > 0,
        hasFunctionDocs: docsByType.function > 0,
        hasClassDocs: docsByType.class > 0,
      },
      rag: {
        available: ragAvailable,
        status: ragAvailable ? 'Ready for questions' : 'Repository not indexed',
        recommendations: ragAvailable ? [] : [
          'Run documentation generation to index your code',
          'Ask specific questions about functions, classes, or APIs',
          'Try general programming questions if code-specific answers aren\'t available',
        ],
      },
      suggestions: {
        nextSteps: ragAvailable
          ? ['Ask about specific functions or APIs', 'Inquire about code architecture']
          : ['Generate documentation first', 'Try general programming questions'],
        exampleQuestions: ragAvailable
          ? [
              'What does the authentication function do?',
              'Show me the user API endpoints',
              'How do you handle database connections?',
              'What security measures are implemented?',
            ]
          : [
              'How do you structure API routes?',
              'What authentication patterns do you use?',
              'How do you handle errors in your API?',
              'What are common patterns in your codebase?',
            ],
      },
    };

    return successResponse(status);
  },
  { requireAuth: true, methods: ['GET'] }
);
