// Corrective C1 (WS6): rename `designSettings.eyebrowStyle` → `taglineStyle`.
//
// For each `designSettings` document (published + drafts) that still carries
// the legacy `eyebrowStyle` field — or has not yet been hydrated with a
// `taglineStyle` value — copy the existing value over to `taglineStyle` and
// unset `eyebrowStyle`. Documents that have already been migrated (have
// `taglineStyle` defined and no `eyebrowStyle`) are skipped automatically.
//
// Idempotent — re-running on already-migrated data finds 0 matches and
// produces 0 mutations. Defaults to dry-run; pass `--apply` to mutate.
//
// Run with:
//   Dry run (default):  npx sanity exec migrations/set-tagline-style.ts --with-user-token
//   Apply:              npx sanity exec migrations/set-tagline-style.ts --with-user-token -- --apply

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

type DesignSettingsDoc = {
  _id: string
  _type: 'designSettings'
  eyebrowStyle?: string | null
  taglineStyle?: string | null
}

const isApply = process.argv.includes('--apply')

async function main() {
  // Match published + drafts. Filter handles both:
  //   1. Legacy docs that still have eyebrowStyle defined.
  //   2. Docs that have neither field (so we can hydrate taglineStyle to
  //      the schema default 'plain' just like set-eyebrow-style.ts did
  //      previously). For the second case the eyebrow value is undefined
  //      and we fall back to 'plain'.
  const docs = await client.fetch<DesignSettingsDoc[]>(
    `*[_type == "designSettings" && (defined(eyebrowStyle) || !defined(taglineStyle))]{
      _id,
      _type,
      eyebrowStyle,
      taglineStyle
    }`,
  )

  console.log(`Found ${docs.length} designSettings document(s) needing migration`)
  console.log(`Mode: ${isApply ? 'APPLY (will mutate)' : 'DRY RUN (no mutations)'}`)
  console.log()

  let migrated = 0
  let errored = 0

  for (const doc of docs) {
    try {
      const next = doc.eyebrowStyle ?? doc.taglineStyle ?? 'plain'
      console.log(`  → ${doc._id}`)
      console.log(`     eyebrowStyle: ${JSON.stringify(doc.eyebrowStyle ?? null)} → (unset)`)
      console.log(`     taglineStyle: ${JSON.stringify(doc.taglineStyle ?? null)} → "${next}"`)

      if (isApply) {
        await client
          .patch(doc._id)
          .set({taglineStyle: next})
          .unset(['eyebrowStyle'])
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
