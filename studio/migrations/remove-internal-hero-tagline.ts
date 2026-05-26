// Corrective C2 (WS6): remove the deprecated `tagline` field from every
// embedded `internalHero` object.
//
// Rationale: InternalHero contains the page's <h1>; nothing semantic should
// sit above it. The Sanity schema dropped the field in this commit, so any
// document type that embeds the `internalHero` object must have its nested
// `hero.tagline` value unset to keep production data clean.
//
// Document types that embed `internalHero` (as of commit time):
//   aboutPage, attorneyIndex, blogIndex, contactPage, eventIndex, faqPage,
//   generalPage, geoPracticeArea, locationPage, practiceArea, serviceAreaIndex,
//   serviceAreaPage, staffIndex, testimonialsPage
//
// Note: `contactPage` and `serviceAreaIndex` ALSO carry a top-level `tagline`
// field that is unrelated to the hero. The migration only unsets `hero.tagline`
// — top-level taglines are intentionally preserved.
//
// Idempotent — the GROQ filter only matches documents where `hero.tagline` is
// still defined, so re-running on already-migrated data finds 0 docs and
// produces 0 mutations. Defaults to dry-run; pass `--apply` to mutate.
//
// Run with:
//   Dry run (default):  npx sanity exec migrations/remove-internal-hero-tagline.ts --with-user-token
//   Apply:              npx sanity exec migrations/remove-internal-hero-tagline.ts --with-user-token -- --apply

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

const HERO_DOC_TYPES = [
  'aboutPage',
  'attorneyIndex',
  'blogIndex',
  'contactPage',
  'eventIndex',
  'faqPage',
  'generalPage',
  'geoPracticeArea',
  'locationPage',
  'practiceArea',
  'serviceAreaIndex',
  'serviceAreaPage',
  'staffIndex',
  'testimonialsPage',
] as const

type HeroDoc = {
  _id: string
  _type: string
  heroTagline?: string | null
}

const isApply = process.argv.includes('--apply')

async function main() {
  // Match published + drafts across every document type that embeds
  // internalHero, where the nested `tagline` is still defined.
  const typeFilter = HERO_DOC_TYPES.map((t) => `"${t}"`).join(', ')
  const docs = await client.fetch<HeroDoc[]>(
    `*[_type in [${typeFilter}] && defined(hero.tagline)]{
      _id,
      _type,
      "heroTagline": hero.tagline
    }`,
  )

  console.log(`Found ${docs.length} document(s) with hero.tagline still defined`)
  console.log(`Mode: ${isApply ? 'APPLY (will mutate)' : 'DRY RUN (no mutations)'}`)
  console.log()

  let migrated = 0
  let errored = 0

  for (const doc of docs) {
    try {
      console.log(`  → ${doc._id} (${doc._type})`)
      console.log(`     hero.tagline: ${JSON.stringify(doc.heroTagline ?? null)} → (unset)`)

      if (isApply) {
        await client.patch(doc._id).unset(['hero.tagline']).commit()
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
