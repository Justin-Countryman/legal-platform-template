// One-time migration: copies the site-level internal-hero defaults from
// `designSettings` (the legacy "Internal Hero" fieldset) into the new
// `heroSettings` singleton (Internal Hero group).
//
//   designSettings.internalHeroBackground   → heroSettings.scheme
//   designSettings.siteHeroBackgroundImage  → heroSettings.backgroundImage
//   designSettings.siteHeroForegroundImage  → heroSettings.foregroundImage
//   designSettings.heroScrimOpacity         → heroSettings.scrimOpacity
//
// The new fields (scrimStyle, sectionBackgroundImage) are NOT touched — they keep
// their schema defaults / stay empty for the editor to set.
//
// Uses setIfMissing, so it only fills empty fields: idempotent AND safe to re-run
// without reverting any edits an editor has already made in Hero Settings. The
// site reads heroSettings with a transitional fallback to designSettings, so
// nothing breaks before or after this runs.
//
// Run with:
//   Dry run (default):  npx sanity exec migrations/move-hero-settings-from-design.ts --with-user-token
//   Apply:              npx sanity exec migrations/move-hero-settings-from-design.ts --with-user-token -- --apply

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

type DesignSettingsHero = {
  internalHeroBackground?: string | null
  heroScrimOpacity?: number | null
  siteHeroBackgroundImage?: unknown
  siteHeroForegroundImage?: unknown
}

const isApply = process.argv.includes('--apply')

async function main() {
  const ds = await client.fetch<DesignSettingsHero | null>(
    `*[_type == "designSettings"][0]{
      internalHeroBackground,
      heroScrimOpacity,
      siteHeroBackgroundImage,
      siteHeroForegroundImage
    }`,
  )

  if (!ds) {
    console.log('No designSettings document found — nothing to migrate.')
    return
  }

  const fields: Record<string, unknown> = {
    scheme: ds.internalHeroBackground ?? 'dark',
    scrimOpacity: typeof ds.heroScrimOpacity === 'number' ? ds.heroScrimOpacity : 80,
  }
  if (ds.siteHeroBackgroundImage) fields.backgroundImage = ds.siteHeroBackgroundImage
  if (ds.siteHeroForegroundImage) fields.foregroundImage = ds.siteHeroForegroundImage

  console.log(`Mode: ${isApply ? 'APPLY (will mutate)' : 'DRY RUN (no mutations)'}`)
  console.log('Target: heroSettings (singleton, _id "heroSettings")')
  console.log('Fields to setIfMissing:')
  for (const [k, v] of Object.entries(fields)) {
    const display = v && typeof v === 'object' ? `[${(v as {_type?: string})._type ?? 'object'}]` : JSON.stringify(v)
    console.log(`  ${k}: ${display}`)
  }
  console.log()

  if (isApply) {
    await client.createIfNotExists({_id: 'heroSettings', _type: 'heroSettings'})
    await client.patch('heroSettings').setIfMissing(fields).commit()
    console.log('✓ heroSettings populated (only previously-empty fields were set).')
  } else {
    console.log('(dry-run — no mutation). Re-run with -- --apply to commit.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
