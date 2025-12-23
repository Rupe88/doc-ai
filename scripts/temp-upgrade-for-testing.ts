import { prisma } from '../lib/db/prisma'

async function upgradeForTesting() {
  try {
    // Find the first user (you) and upgrade to TEAM tier
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('No users found')
      return
    }

    console.log(`Upgrading ${user.email} from ${user.subscriptionTier} to TEAM`)

    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionTier: 'TEAM' }
    })

    console.log('✅ Upgrade complete! You now have:')
    console.log('- Unlimited repositories')
    console.log('- Unlimited chats')
    console.log('- 50 generation jobs per day')

    console.log('\n🔄 Restart your dev server to apply changes')
    console.log('📝 When done testing, run: npm run downgrade-testing')

  } catch (error) {
    console.error('Failed to upgrade:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function downgradeForTesting() {
  try {
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('No users found')
      return
    }

    console.log(`Downgrading ${user.email} from ${user.subscriptionTier} to FREE`)

    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionTier: 'FREE' }
    })

    console.log('✅ Downgraded to FREE tier')
    console.log('- 3 repositories limit')
    console.log('- 10 chats per month')
    console.log('- 1 generation job per day')

  } catch (error) {
    console.error('Failed to downgrade:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run based on command line arg
const command = process.argv[2]
if (command === 'down') {
  downgradeForTesting()
} else {
  upgradeForTesting()
}

