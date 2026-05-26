// Seeds eventCategory documents based on the existing blog category names.
// Run with:  npx sanity exec migrations/seed-event-categories.ts --with-user-token

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

const CATEGORIES = [
  'Business Law',
  'Corporate Law',
  'Elder Law',
  'Employment Law',
  'Estate Planning',
  'Family Law',
  'Firm News',
  'Nonprofit Law',
  'Residential Real Estate',
]

function toId(name: string) {
  return 'eventCategory-' + name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

async function main() {
  for (const name of CATEGORIES) {
    await client.createOrReplace({
      _type: 'eventCategory',
      _id: toId(name),
      name,
    })
    console.log(`  ✓ ${name}`)
  }
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
