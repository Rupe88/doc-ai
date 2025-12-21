import { NextRequest } from 'next/server'
import { getAuthenticatedUser, deleteSession } from '@/lib/middleware/auth'
import { createApiHandler } from '@/lib/utils/api-wrapper'
import { successResponse } from '@/lib/utils/error-handler'

export const POST = createApiHandler(
  async (context) => {
    const authResult = await getAuthenticatedUser(context.request)
    
    if (authResult.user) {
      const sessionToken = context.request.cookies.get('session')?.value
      
      if (sessionToken) {
        await deleteSession(sessionToken)
      }
    }

    const response = successResponse({ message: 'Logged out successfully' })
    response.cookies.delete('session')
    
    return response
  },
  {
    requireAuth: false,
    methods: ['POST'],
  }
)

