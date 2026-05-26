// One-time migration: renames the `designSettings.buttonAnimation` value
// `'standard'` to `'none'` on any document holding the legacy value.
//
// Rationale: Workstream 2 Commit 7 renames the schema option in place — the
// old `'standard'` mode emitted no CSS rules (it was the no-op default that
// let the class-string color hover be the only visual). The new `'none'` is
// the same no-op, just labeled clearly as "color hover only". Documents
// holding `'standard'` continue to render identically after this commit
// (CSS no-op for both), but the data is realigned with the new schema so
// Studio doesn't display an unknown-value warning.
//
// Idempotent — re-running on already-migrated data produces 0 mutations.
// Defaults to dry-run; pass `--apply` to actually mutate.
//
// Run with:
//   Dry run (default):  npx sanity exec migrations/migrate-buttonAnimation-standard-to-none.ts --with-user-token
//   Apply:              npx sanity exec migrations/migrate-buttonAnimation-standard-to-none.ts --with-user-token -- --apply
//
// The `-- --apply` separator is required because `sanity exec` swallows its
// own flags otherwise; everything after `--` is forwarded to the script.

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

type DesignSettingsDoc = {
  _id: string
  _type: 'designSettings'
  buttonAnimation?: string | null
}

const isApply = process.argv.includes('--apply')

async function main() {
  // Pull both published and draft designSettings docs in one pass. The Sanity
  // export-API draft id pattern is `drafts.<id>`, so a single _type filter
  // captures both.
  const docs = await client.fetch<DesignSettingsDoc[]>(
    `*[_type == "designSettings" && buttonAnimation == "standard"]{
      _id,
      _type,
      buttonAnimation
    }`,
  )

  console.log(`Found ${docs.length} designSettings document(s) with buttonAnimation == "standard"`)
  console.log(`Mode: ${isApply ? 'APPLY (will mutate)' : 'DRY RUN (no mutations)'}`)
  console.log()

  let migrated = 0
  let errored = 0

  for (const doc of docs) {
    try {
      console.log(`  → ${doc._id}`)
      console.log(`     buttonAnimation: "${doc.buttonAnimation}" → "none"`)

      if (isApply) {
        await client
          .patch(doc._id)
          .set({buttonAnimation: 'none'})
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
