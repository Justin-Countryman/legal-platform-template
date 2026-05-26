// Removes the 3 temporary preview location documents added for Districts footer testing.
// Run with:  npx sanity exec migrations/remove-preview-locations.ts --with-user-token

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

const PREVIEW_IDS = [
  'location-preview-minneapolis',
  'location-preview-plymouth',
  'location-preview-eden-prairie',
]

async function main() {
  for (const id of PREVIEW_IDS) {
    await client.delete(id)
    console.log(`  ✓ Deleted ${id}`)
  }
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
