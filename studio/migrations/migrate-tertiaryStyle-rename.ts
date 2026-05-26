// One-time migration: resets `designSettings.tertiaryStyle` legacy enum values
// (`'quiet'`, `'prominent'`) to the new default `'plain'` on any document
// holding a legacy value.
//
// Rationale: WS3 retune simplifies the tertiary system. The two styles now
// differ only by letter-spacing (sentence case for both, no uppercase, no
// underline, no bold). The schema enum is renamed (Plain / Tracked) and the
// new default is `'plain'`. Per the WS3 retune kickoff, client documents reset
// to `'plain'` rather than preserving prior intent — Justin wants the new
// default surface for visual confirmation. Documents holding the old values
// would otherwise display an unknown-value warning in Studio.
//
// Idempotent — re-running on already-migrated data produces 0 mutations.
// Defaults to dry-run; pass `--apply` to actually mutate.
//
// Run with:
//   Dry run (default):  npx sanity exec migrations/migrate-tertiaryStyle-rename.ts --with-user-token
//   Apply:              npx sanity exec migrations/migrate-tertiaryStyle-rename.ts --with-user-token -- --apply

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

type DesignSettingsDoc = {
  _id: string
  _type: 'designSettings'
  tertiaryStyle?: string | null
}

const isApply = process.argv.includes('--apply')

async function main() {
  const docs = await client.fetch<DesignSettingsDoc[]>(
    `*[_type == "designSettings" && tertiaryStyle in ["quiet", "prominent"]]{
      _id,
      _type,
      tertiaryStyle
    }`,
  )

  console.log(`Found ${docs.length} designSettings document(s) with legacy tertiaryStyle values`)
  console.log(`Mode: ${isApply ? 'APPLY (will mutate)' : 'DRY RUN (no mutations)'}`)
  console.log()

  let migrated = 0
  let errored = 0

  for (const doc of docs) {
    try {
      const next = 'plain'
      console.log(`  → ${doc._id}`)
      console.log(`     tertiaryStyle: "${doc.tertiaryStyle}" → "${next}"`)

      if (isApply) {
        await client
          .patch(doc._id)
          .set({tertiaryStyle: next})
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
