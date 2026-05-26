// One-time migration: sets pageName on all attorneyPage documents
// using firstName + middleName + lastName + suffix, and clears any h1 override.
//
// Run with:  npx sanity exec migrations/patch-attorney-page-names.ts --with-user-token

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

async function main() {
  const attorneys = await client.fetch<
    Array<{
      _id: string
      firstName?: string
      middleName?: string
      lastName?: string
      suffix?: string
    }>
  >(`*[_type == "attorneyPage"]{_id, firstName, middleName, lastName, suffix}`)

  console.log(`Found ${attorneys.length} attorney document(s)`)

  let updated = 0
  for (const doc of attorneys) {
    const pageName = [doc.firstName, doc.middleName, doc.lastName, doc.suffix]
      .filter(Boolean)
      .join(' ')

    if (!pageName) {
      console.log(`  Skipping ${doc._id} — no name fields`)
      continue
    }

    await client.patch(doc._id).set({pageName}).unset(['h1']).commit()
    console.log(`  ✓ ${pageName}`)
    updated++
  }

  console.log(`\nDone — updated ${updated} document(s)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
