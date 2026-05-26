// One-time migration: consolidates the GlobalCta `primaryButton` and
// `secondaryButton` named slots into a single `buttons` array.
//
//   primaryButton   → buttons[0]
//   secondaryButton → buttons[1]
//
// Idempotent — re-running on already-migrated data produces 0 mutations.
// Defaults to dry-run; pass `--apply` to actually mutate.
//
// Run with:
//   Dry run (default):  npx sanity exec migrations/migrate-globalCta-buttons.ts --with-user-token
//   Apply:              npx sanity exec migrations/migrate-globalCta-buttons.ts --with-user-token -- --apply
//
// The `-- --apply` separator is required because `sanity exec` swallows its
// own flags otherwise; everything after `--` is forwarded to the script.

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

type CtaButton = {
  title?: string | null
  url?: string | null
  variant?: string | null
}

type GlobalCtaDoc = {
  _id: string
  _type: 'globalCta'
  primaryButton?: CtaButton | null
  secondaryButton?: CtaButton | null
  buttons?: CtaButton[] | null
}

const isApply = process.argv.includes('--apply')

function isPopulated(btn: CtaButton | null | undefined): btn is CtaButton {
  if (!btn) return false
  // Treat any of these signals as "this slot has data worth migrating"
  return Boolean(btn.title || btn.url || btn.variant)
}

async function main() {
  // Pull both published and draft globalCta docs in one pass. The Sanity
  // export-API draft id pattern is `drafts.<id>`, so a single _type filter
  // captures both.
  const docs = await client.fetch<GlobalCtaDoc[]>(
    `*[_type == "globalCta"]{
      _id,
      _type,
      primaryButton{title, url, variant},
      secondaryButton{title, url, variant},
      buttons[]{title, url, variant}
    }`,
  )

  console.log(`Found ${docs.length} globalCta document(s)`)
  console.log(`Mode: ${isApply ? 'APPLY (will mutate)' : 'DRY RUN (no mutations)'}`)
  console.log()

  let migrated = 0
  let skipped = 0
  let errored = 0

  for (const doc of docs) {
    try {
      const hasPrimary = isPopulated(doc.primaryButton)
      const hasSecondary = isPopulated(doc.secondaryButton)
      const hasButtons = Array.isArray(doc.buttons) && doc.buttons.length > 0

      // Idempotency guard: nothing to migrate, and either buttons[] is already
      // populated OR there were never any buttons to begin with — skip.
      if (!hasPrimary && !hasSecondary) {
        console.log(`  - ${doc._id} — skipped (no named slots; buttons=${hasButtons ? doc.buttons!.length : 0})`)
        skipped++
        continue
      }

      // Build the new buttons array. Preserve order: primary first, secondary
      // second. Strip any extra fields Sanity might surface (the GROQ slice
      // already restricts to title/url/variant, but be defensive).
      const newButtons: CtaButton[] = []
      if (hasPrimary) {
        const b = doc.primaryButton!
        newButtons.push({title: b.title ?? null, url: b.url ?? null, variant: b.variant ?? null})
      }
      if (hasSecondary) {
        const b = doc.secondaryButton!
        newButtons.push({title: b.title ?? null, url: b.url ?? null, variant: b.variant ?? null})
      }

      console.log(`  → ${doc._id}`)
      console.log(`     primaryButton:   ${JSON.stringify(doc.primaryButton ?? null)}`)
      console.log(`     secondaryButton: ${JSON.stringify(doc.secondaryButton ?? null)}`)
      console.log(`     buttons[] (new): ${JSON.stringify(newButtons)}`)

      if (isApply) {
        await client
          .patch(doc._id)
          .set({buttons: newButtons})
          .unset(['primaryButton', 'secondaryButton'])
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
  console.log(`  Skipped:         ${skipped}`)
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
