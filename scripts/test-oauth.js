#!/usr/bin/env node

/**
 * OAuth Configuration Test Script
 * Run this script to verify your OAuth setup before deployment
 */

const https = require('https')

function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...\n')

  const required = [
    'NEXT_PUBLIC_APP_URL',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY'
  ]

  let allSet = true

  required.forEach(key => {
    const value = process.env[key]
    const status = value ? '✅ SET' : '❌ MISSING'
    console.log(`${key}: ${status}`)

    if (!value) {
      allSet = false
    }
  })

  if (!allSet) {
    console.log('\n❌ Some required environment variables are missing!')
    process.exit(1)
  }

  console.log('\n✅ All required environment variables are set!\n')
  return true
}

function validateUrls() {
  console.log('🔗 Validating URLs...\n')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const callbackUrl = `${appUrl}/api/auth/callback/github`

  try {
    new URL(appUrl)
    console.log(`✅ NEXT_PUBLIC_APP_URL is valid: ${appUrl}`)
  } catch {
    console.log(`❌ NEXT_PUBLIC_APP_URL is invalid: ${appUrl}`)
    process.exit(1)
  }

  try {
    new URL(callbackUrl)
    console.log(`✅ Callback URL is valid: ${callbackUrl}`)
  } catch {
    console.log(`❌ Callback URL is invalid: ${callbackUrl}`)
    process.exit(1)
  }

  console.log('\n✅ All URLs are valid!\n')
  return { appUrl, callbackUrl }
}

async function testGitHubOAuth(callbackUrl) {
  console.log('🔐 Testing GitHub OAuth configuration...\n')

  const clientId = process.env.GITHUB_CLIENT_ID

  // Test OAuth authorization URL construction
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=repo%20read%3Auser%20user%3Aemail`

  console.log(`OAuth URL: ${authUrl}`)

  // Test if we can reach GitHub (basic connectivity)
  return new Promise((resolve) => {
    https.get('https://github.com', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ GitHub is reachable')
        resolve(true)
      } else {
        console.log(`❌ GitHub returned status: ${res.statusCode}`)
        resolve(false)
      }
    }).on('error', (err) => {
      console.log(`❌ Cannot reach GitHub: ${err.message}`)
      resolve(false)
    })
  })
}

async function main() {
  console.log('🚀 OAuth Configuration Test\n')
  console.log('================================\n')

  try {
    checkEnvironmentVariables()
    const { appUrl, callbackUrl } = validateUrls()
    await testGitHubOAuth(callbackUrl)

    console.log('\n🎉 OAuth configuration test completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Deploy your application')
    console.log(`2. Update your GitHub OAuth app callback URL to: ${callbackUrl}`)
    console.log('3. Test the OAuth flow in production')
    console.log('\n💡 If you still get auth errors, check the production logs for detailed error messages.')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { checkEnvironmentVariables, validateUrls, testGitHubOAuth }
