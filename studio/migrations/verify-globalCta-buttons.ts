// One-time verification: prints the post-migration shape of every globalCta
// document. Confirms `buttons[]` is populated and the legacy named slots are
// absent.
//
// Run with:
//   npx sanity exec migrations/verify-globalCta-buttons.ts --with-user-token

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

async function main() {
  // Fetch the raw document (no projection) so we can confirm the absence of
  // primaryButton / secondaryButton fields on the persisted record.
  const docs = await client.fetch<any[]>(`*[_type == "globalCta"]`)

  for (const doc of docs) {
    console.log(`Document: ${doc._id}`)
    console.log(`  layout:         ${doc.layout ?? '(unset)'}`)
    console.log(`  heading:        ${doc.heading ?? '(unset)'}`)
    console.log(`  buttons:        ${JSON.stringify(doc.buttons ?? null)}`)
    console.log(`  primaryButton:  ${doc.primaryButton === undefined ? '(absent ✓)' : JSON.stringify(doc.primaryButton)}`)
    console.log(`  secondaryButton: ${doc.secondaryButton === undefined ? '(absent ✓)' : JSON.stringify(doc.secondaryButton)}`)
    console.log()
  }

  console.log(`Total globalCta documents: ${docs.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
