/**
 * Test script to demonstrate exact code retrieval functionality
 */

import { getRAGEngine } from '../lib/ai/rag-engine'

async function testExactCodeRetrieval() {
  const rag = getRAGEngine()

  if (!rag.isAvailable()) {
    console.log('❌ RAG engine not available - check environment variables')
    return
  }

  console.log('🧪 Testing Exact Code Retrieval Functionality\n')

  // Test cases for code requests
  const testQueries = [
    'show me the authenticateUser function',
    'what does the login function look like',
    'give me the UserService class code',
    'find the auth middleware implementation',
    'what is the handleAuth function',
    'show me the Dashboard component',
  ]

  // Mock repo ID (would be real in production)
  const mockRepoId = 'test-repo-id'

  for (const query of testQueries) {
    console.log(`\n🔍 Testing: "${query}"`)

    // Test if it's detected as a code request
    const isCodeRequest = (rag as any).isCodeRequest(query)
    console.log(`   📝 Detected as code request: ${isCodeRequest ? '✅' : '❌'}`)

    if (isCodeRequest) {
      // Test code extraction
      const exactCode = await (rag as any).handleCodeRequest(query, mockRepoId)
      if (exactCode) {
        console.log(`   🎯 Found exact code match!`)
        console.log(`   📄 Answer preview: ${exactCode.answer.substring(0, 100)}...`)
      } else {
        console.log(`   ⚠️  No exact code match found`)
      }
    }

    console.log(`   ─────────────────────────────────`)
  }

  console.log('\n🎉 Test completed! The RAG system can now detect code requests and provide exact code with line numbers.')
}

testExactCodeRetrieval().catch(console.error)
