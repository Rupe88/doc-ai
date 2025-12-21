import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/auth'
import { createApiHandler } from '@/lib/utils/api-wrapper'
import { successResponse } from '@/lib/utils/error-handler'

export const dynamic = 'force-dynamic'

export const GET = createApiHandler(
  async (context) => {
    const authResult = await getAuthenticatedUser(context.request)

    if (!authResult.user) {
      return successResponse(null, 200)
    }

    return successResponse({
      user: authResult.user,
    })
  },
  {
    requireAuth: false,
    methods: ['GET'],
  }
)

