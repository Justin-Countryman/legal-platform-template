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
// AUTHORING NOTE (bug class): a singleton setIfMissing must reconcile drafts.<id>
// too; prefer fetch-by-_type-and-iterate so BOTH the published and draft ids are
// caught. A hardcoded published-only write left an unpublished draft heroSettings
// unpopulated — the previewDrafts surface renders stale, and publishing that draft
// loses the fields in production. We reconcile the draft ONLY if it already exists
// (never manufacture one on a clean client), setIfMissing only.
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

  // Fetch-by-_type returns published AND drafts.<id> in one pass; we patch each
  // doc._id below so both are reconciled. The draft appears here only if it exists.
  const targets = await client.fetch<{_id: string}[]>(`*[_type=="heroSettings"]{_id}`)
  const drafts = targets.filter((t) => t._id.startsWith('drafts.'))

  console.log(`Mode: ${isApply ? 'APPLY (will mutate)' : 'DRY RUN (no mutations)'}`)
  console.log('Target heroSettings documents (published + any draft):')
  if (!targets.length) {
    console.log('  (none yet — the published singleton "heroSettings" will be created and written)')
  } else {
    for (const t of targets) {
      const kind = t._id.startsWith('drafts.') ? 'draft    ' : 'published'
      console.log(`  ${kind}  ${t._id}`)
    }
  }
  if (!drafts.length) console.log('  (no draft heroSettings present — nothing to reconcile on the draft side)')
  console.log('Fields to setIfMissing (only previously-empty fields are set, on every target):')
  for (const [k, v] of Object.entries(fields)) {
    const display = v && typeof v === 'object' ? `[${(v as {_type?: string})._type ?? 'object'}]` : JSON.stringify(v)
    console.log(`  ${k}: ${display}`)
  }
  console.log()

  if (isApply) {
    // Ensure the published singleton exists, then reconcile every existing id —
    // published + any draft.
    await client.createIfNotExists({_id: 'heroSettings', _type: 'heroSettings'})
    const ids = (await client.fetch<{_id: string}[]>(`*[_type=="heroSettings"]{_id}`)).map((d) => d._id)
    for (const _id of ids) {
      await client.patch(_id).setIfMissing(fields).commit()
      console.log(`✓ ${_id}: heroSettings populated (only previously-empty fields were set).`)
    }
  } else {
    console.log('(dry-run — no mutation). Re-run with -- --apply to commit.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
