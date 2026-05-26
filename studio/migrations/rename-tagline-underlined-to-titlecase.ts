// Rename `designSettings.taglineStyle` value 'underlined' → 'titlecase'.
//
// The 'underlined' option was retired in favor of 'titlecase' (capitalize each
// word, no underline decoration, tight letter-spacing). For each
// `designSettings` document (published + drafts) whose taglineStyle is still
// 'underlined', set it to 'titlecase'.
//
// Idempotent — re-running on already-migrated data finds 0 matches and
// produces 0 mutations. Defaults to dry-run; pass `--apply` to mutate.
//
// Run with:
//   Dry run (default):  npx sanity exec migrations/rename-tagline-underlined-to-titlecase.ts --with-user-token
//   Apply:              npx sanity exec migrations/rename-tagline-underlined-to-titlecase.ts --with-user-token -- --apply

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

type DesignSettingsDoc = {
  _id: string
  _type: 'designSettings'
  taglineStyle?: string | null
}

const isApply = process.argv.includes('--apply')

async function main() {
  const docs = await client.fetch<DesignSettingsDoc[]>(
    `*[_type == 'designSettings' && taglineStyle == 'underlined']{
      _id,
      _type,
      taglineStyle
    }`,
  )

  console.log(`Found ${docs.length} designSettings document(s) with taglineStyle == 'underlined'`)
  console.log(`Mode: ${isApply ? 'APPLY (will mutate)' : 'DRY RUN (no mutations)'}`)
  console.log()

  let migrated = 0
  let errored = 0

  for (const doc of docs) {
    try {
      console.log(`  → ${doc._id}`)
      console.log(`     taglineStyle: "underlined" → "titlecase"`)

      if (isApply) {
        await client
          .patch(doc._id)
          .set({taglineStyle: 'titlecase'})
          .commit()
        console.log(`     ✓ migrated`)
      } else {
        console.log(`     (dry-run — no mutation)`)
      }
      migrated++
    } catch (err) {
      errored++
      console.error(`  ✗ ${doc._id} — ERROR:`, err)
    }
  }

  console.log()
  console.log(`Summary:`)
  console.log(`  Total processed: ${docs.length}`)
  console.log(`  Migrated:        ${migrated}`)
  console.log(`  Errored:         ${errored}`)
  if (!isApply && migrated > 0) {
    console.log()
    console.log(`This was a DRY RUN. Re-run with -- --apply to commit mutations.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
