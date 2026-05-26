// One-time migration: sets layout = 'splitHero' (Slate) on all attorneyPage documents.
//
// Run with:  npx sanity exec migrations/set-slate-layout.ts --with-user-token

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

async function main() {
  const attorneys = await client.fetch<Array<{_id: string; pageName?: string; profileLayout?: string}>>(
    `*[_type == "attorneyPage"]{_id, pageName, profileLayout}`
  )

  console.log(`Found ${attorneys.length} attorney document(s)`)

  let updatedDocs = 0

  for (const doc of attorneys) {
    if (doc.profileLayout === 'splitHero') {
      console.log(`  – ${doc.pageName ?? doc._id} (already Slate, skipping)`)
      continue
    }
    await client.patch(doc._id).set({profileLayout: 'splitHero'}).commit()
    console.log(`  ✓ ${doc.pageName ?? doc._id}`)
    updatedDocs++
  }

  console.log(`\nDone — updated ${updatedDocs} document(s)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
