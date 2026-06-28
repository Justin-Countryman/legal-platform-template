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

  // ── Idempotency: report the target's current state + the setIfMissing decision ──
  const existing = await client.fetch(`*[_type=="heroSettings"][0].homepageHero`)
  const targetState = existing ? 'EXISTS' : 'MISSING'
  const decision = existing ? 'SKIP — setIfMissing no-op, changes nothing' : 'WRITE the resolved object below'

  console.log(`Mode: ${isApply ? 'APPLY (will mutate)' : 'DRY RUN (no mutations)'}`)
  console.log(`Target heroSettings.homepageHero: ${targetState}  →  setIfMissing decision: ${decision}`)
  console.log('')
  console.log('Resolved fields captured FROM inheritance (would be blank with a naive copy):')
  console.log(inherited.length ? inherited.map((s) => '  ' + s).join('\n') : '  (none — homePage.hero set every surface field explicitly)')
  console.log('')
  console.log('Full resolved heroSettings.homepageHero that WOULD be written:')
  console.log(JSON.stringify(design, null, 2))

  if (isApply) {
    await client.createIfNotExists({_id: 'heroSettings', _type: 'heroSettings'})
    await client.patch('heroSettings').setIfMissing({homepageHero: design}).commit()
    console.log('\n✓ heroSettings.homepageHero populated (no-op if it already existed).')
  } else {
    console.log('\n(dry-run — no mutation). Re-run with -- --apply to commit.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
