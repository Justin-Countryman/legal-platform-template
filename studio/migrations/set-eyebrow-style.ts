// One-time preflight: sets `designSettings.eyebrowStyle = 'plain'` on any
// existing client document that does not yet carry the field.
//
// Rationale: WS6 Phase 2 introduces the `eyebrowStyle` field on
// `designSettings`. The schema declares `initialValue: 'plain'`, which covers
// newly-created documents — but existing documents won't have the property
// hydrated until they are saved through Studio. The Eyebrow primitive (Commit
// 7) reads this field via the design-tokens injection pipeline, and an
// undefined value would force the runtime to rely on its fallback default.
// Patching the existing document explicitly ensures the runtime sees a real
// `'plain'` value from the moment Commit 7 ships.
//
// Idempotent — re-running on already-migrated data produces 0 mutations.
// Defaults to dry-run; pass `--apply` to actually mutate.
//
// Run with:
//   Dry run (default):  npx sanity exec migrations/set-eyebrow-style.ts --with-user-token
//   Apply:              npx sanity exec migrations/set-eyebrow-style.ts --with-user-token -- --apply

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

type DesignSettingsDoc = {
  _id: string
  _type: 'designSettings'
  eyebrowStyle?: string | null
}

const isApply = process.argv.includes('--apply')

async function main() {
  const docs = await client.fetch<DesignSettingsDoc[]>(
    `*[_type == "designSettings" && !defined(eyebrowStyle)]{
      _id,
      _type,
      eyebrowStyle
    }`,
  )

  console.log(`Found ${docs.length} designSettings document(s) without eyebrowStyle`)
  console.log(`Mode: ${isApply ? 'APPLY (will mutate)' : 'DRY RUN (no mutations)'}`)
  console.log()

  let migrated = 0
  let errored = 0

  for (const doc of docs) {
    try {
      const next = 'plain'
      console.log(`  → ${doc._id}`)
      console.log(`     eyebrowStyle: (unset) → "${next}"`)

      if (isApply) {
        await client
          .patch(doc._id)
          .set({eyebrowStyle: next})
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
