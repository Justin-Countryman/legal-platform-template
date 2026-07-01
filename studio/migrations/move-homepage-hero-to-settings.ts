// One-time migration: relocate the homepage hero's DESIGN from `homePage.hero`
// into `heroSettings.homepageHero` (the new Homepage Hero tab). The homepage
// hero's CONTENT (eyebrow / heading / description / buttons) stays on
// `homePage.hero`.
//
// RESOLVED, not a blind copy: Phase 2 DECOUPLES the homepage hero from the
// internal site defaults (a hard cut — no runtime fallback). So any surface field
// the homepage currently *inherits* (scheme / background image / foreground image /
// scrim opacity unset on homePage.hero → falls back to the internal default) is
// written here as its concrete RESOLVED value, not left blank — otherwise the
// homepage would lose that inherited surface after the cutover. Layout / media /
// silo fields are page-only (no inheritance) and copied verbatim.
//
// Non-destructive: COPIES design into heroSettings via setIfMissing on the whole
// `homepageHero` object → a no-op on re-run (safe to run, fail, re-run). The
// `homePage.hero` design *data* is left intact; the cutover commit removes only the
// schema fields, so rollback is just reverting code.
//
// AUTHORING NOTE (bug class): a singleton setIfMissing must reconcile drafts.<id>
// too; prefer fetch-by-_type-and-iterate so BOTH the published and draft ids are
// caught. Writing only the hardcoded published id left an unpublished draft
// heroSettings without homepageHero — the previewDrafts surface then rendered a
// fallback hero, and publishing that draft wiped homepageHero in production. We
// reconcile the draft ONLY if it already exists (never manufacture a draft on a
// clean client), and setIfMissing only (an editor's in-progress draft hero is
// never clobbered).
//
// Run from a CLIENT studio (real projectId + data), migration BEFORE the cutover deploy:
//   Dry run:  npx sanity exec migrations/move-homepage-hero-to-settings.ts --with-user-token
//   Apply:    npx sanity exec migrations/move-homepage-hero-to-settings.ts --with-user-token -- --apply

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})
const isApply = process.argv.includes('--apply')

// Page-only design fields — no inheritance, copied verbatim from homePage.hero.
const COPY_FIELDS = [
  'skeleton', 'heightMode', 'contentAlign', 'backdrop', 'foreground', 'contentStrip',
  'splitMedia', 'splitImageStyle', 'splitImageRatio', 'textTreatment', 'mediaSide', 'motion',
  'sectionBackgroundImage', 'backgroundNone', 'scrimStyle', 'foregroundNone',
  'galleryImages', 'videoUrl', 'siloLayout', 'practiceAreaItems',
] as const

type Img = {asset?: {_ref?: string}} | null | undefined
const hasAsset = (i: Img): boolean => !!i?.asset?._ref

async function main() {
  const hero = await client.fetch<Record<string, unknown> | null>(`*[_type=="homePage"][0].hero`)
  if (!hero) {
    console.log('No homePage.hero found — nothing to migrate.')
    return
  }

  // Internal site defaults: heroSettings (v0.4.0) with the legacy designSettings fallback.
  const hs = await client.fetch<Record<string, unknown> | null>(
    `*[_type=="heroSettings"][0]{ scheme, scrimOpacity, backgroundImage, foregroundImage }`,
  )
  const ds = await client.fetch<Record<string, unknown> | null>(
    `*[_type=="designSettings"][0]{ internalHeroBackground, heroScrimOpacity, siteHeroBackgroundImage, siteHeroForegroundImage }`,
  )

  const internalScheme = ((hs?.scheme ?? ds?.internalHeroBackground) === 'light' ? 'light' : 'dark') as 'light' | 'dark'
  const internalScrim =
    typeof hs?.scrimOpacity === 'number' ? hs.scrimOpacity
    : typeof ds?.heroScrimOpacity === 'number' ? ds.heroScrimOpacity
    : 80
  const internalBg = (hs?.backgroundImage ?? ds?.siteHeroBackgroundImage ?? null) as Img
  const internalFg = (hs?.foregroundImage ?? ds?.siteHeroForegroundImage ?? null) as Img

  const h = hero as Record<string, any>
  const design: Record<string, unknown> = {_type: 'homeHeroDesign'}
  for (const f of COPY_FIELDS) if (h[f] !== undefined) design[f] = h[f]

  // ── Resolved surface fields (the inheriting ones) ──
  const inherited: string[] = []
  // Scheme — write the concrete resolved value (never 'inherit', nothing to inherit from post-cutover).
  if (h.schemeOverride === 'dark' || h.schemeOverride === 'light') {
    design.schemeOverride = h.schemeOverride
  } else {
    design.schemeOverride = internalScheme
    inherited.push(`schemeOverride  <- internal default '${internalScheme}'  (homePage.hero: ${JSON.stringify(h.schemeOverride ?? null)})`)
  }
  // Scrim opacity.
  if (typeof h.scrimOpacityOverride === 'number') {
    design.scrimOpacityOverride = h.scrimOpacityOverride
  } else {
    design.scrimOpacityOverride = internalScrim
    inherited.push(`scrimOpacityOverride  <- internal default ${internalScrim}  (homePage.hero: unset)`)
  }
  // Background image — page upload wins; else (unless forced none) the internal default.
  if (hasAsset(h.backgroundImage)) {
    design.backgroundImage = h.backgroundImage
  } else if (!h.backgroundNone && hasAsset(internalBg)) {
    design.backgroundImage = internalBg
    inherited.push('backgroundImage  <- internal default image  (homePage.hero: unset)')
  }
  // Foreground image — same shape.
  if (hasAsset(h.foregroundImage)) {
    design.foregroundImage = h.foregroundImage
  } else if (!h.foregroundNone && hasAsset(internalFg)) {
    design.foregroundImage = internalFg
    inherited.push('foregroundImage  <- internal default image  (homePage.hero: unset)')
  }

  // ── Idempotency: report every target's current state + the setIfMissing decision ──
  // Fetch-by-_type returns published AND drafts.<id> in one pass; we patch each
  // doc._id below so both are reconciled. The draft appears here only if it exists.
  const targets = await client.fetch<{_id: string; hasHomepageHero: boolean}[]>(
    `*[_type=="heroSettings"]{_id, "hasHomepageHero": defined(homepageHero)}`,
  )
  const drafts = targets.filter((t) => t._id.startsWith('drafts.'))

  console.log(`Mode: ${isApply ? 'APPLY (will mutate)' : 'DRY RUN (no mutations)'}`)
  console.log('Target heroSettings documents (published + any draft):')
  if (!targets.length) {
    console.log('  (none yet — the published singleton "heroSettings" will be created and written)')
  } else {
    for (const t of targets) {
      const kind = t._id.startsWith('drafts.') ? 'draft    ' : 'published'
      const state = t.hasHomepageHero ? 'EXISTS' : 'MISSING'
      const decision = t.hasHomepageHero ? 'SKIP — setIfMissing no-op, changes nothing' : 'WRITE the resolved object below'
      console.log(`  ${kind}  ${t._id}: homepageHero ${state}  →  ${decision}`)
    }
  }
  if (!drafts.length) console.log('  (no draft heroSettings present — nothing to reconcile on the draft side)')
  console.log('')
  console.log('Resolved fields captured FROM inheritance (would be blank with a naive copy):')
  console.log(inherited.length ? inherited.map((s) => '  ' + s).join('\n') : '  (none — homePage.hero set every surface field explicitly)')
  console.log('')
  console.log('Full resolved heroSettings.homepageHero that WOULD be written:')
  console.log(JSON.stringify(design, null, 2))

  if (isApply) {
    // Ensure the published singleton exists (the source here is homePage.hero,
    // not heroSettings), then reconcile every existing id — published + any draft.
    await client.createIfNotExists({_id: 'heroSettings', _type: 'heroSettings'})
    const ids = (await client.fetch<{_id: string}[]>(`*[_type=="heroSettings"]{_id}`)).map((d) => d._id)
    for (const _id of ids) {
      await client.patch(_id).setIfMissing({homepageHero: design}).commit()
      console.log(`✓ ${_id}: heroSettings.homepageHero setIfMissing applied (no-op if it already existed).`)
    }
  } else {
    console.log('\n(dry-run — no mutation). Re-run with -- --apply to commit.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
