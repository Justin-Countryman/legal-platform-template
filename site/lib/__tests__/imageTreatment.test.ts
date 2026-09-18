import {__unstable__loadDesignSystem} from '@tailwindcss/node'
import fs from 'node:fs'
import path from 'node:path'
import {beforeAll, describe, expect, it} from 'vitest'

import {findUnknown, readPlainCssClasses} from '../../scripts/check-unknown-utility-classes.mjs'
import {
  ALLOWED_TREATMENTS,
  RESOLVED_TREATMENTS,
  TREATMENT_CLASSES,
  resolveTreatment,
  treatmentClasses,
} from '../imageTreatment'

// ─── Image treatment ──────────────────────────────────────────────────────────
//
// Phase 11 (monorepo WS-V1-PHASE11-DESIGN §7 amendment 4). Two things are pinned:
// how a stored value resolves (explicit, inherit, the site default, the
// placement's allowed set, tint on a dark band), and that every class in the
// treatment map is a class Tailwind actually emits. The map lives in a TS
// object, where `check-unknown-utility-classes` (JSX className only) and ESLint's
// `no-arbitrary-color` (JSX only) never look, so this test asks the checker's own
// oracle directly.

const SITE_ROOT = path.resolve(__dirname, '../..')

let designSystem: {candidatesToCss: (names: string[]) => (string | null)[]}
let plainCss: Set<string>

beforeAll(async () => {
  designSystem = await __unstable__loadDesignSystem(fs.readFileSync(path.join(SITE_ROOT, 'app/globals.css'), 'utf8'), {
    base: SITE_ROOT,
  })
  plainCss = readPlainCssClasses(SITE_ROOT)
})

const everyClass = () =>
  [...new Set(Object.values(TREATMENT_CLASSES).flatMap((pair) => `${pair.wrapper} ${pair.image}`.split(/\s+/).filter(Boolean)))]

describe('resolveTreatment', () => {
  it('an explicit treatment wins over the site default', () => {
    expect(resolveTreatment('framed', 'slab', 'contentMedia')).toBe('framed')
  })

  it.each([['inherit'], [null], [undefined], ['not-a-treatment']])('%s takes the site default', (value) => {
    expect(resolveTreatment(value as string | null | undefined, 'rounded', 'contentMedia')).toBe('rounded')
  })

  it('with no site default (until Phase 16 adds one) inherit resolves to plain', () => {
    expect(resolveTreatment('inherit', undefined, 'contentMedia')).toBe('plain')
    expect(resolveTreatment(undefined, null, 'contentMedia')).toBe('plain')
  })

  it('a cutout takes only slab; anything else renders it plain', () => {
    expect(resolveTreatment('slab', null, 'cutout')).toBe('slab')
    for (const t of ['framed', 'rounded', 'scrim', 'tint'] as const) expect(resolveTreatment(t, null, 'cutout')).toBe('plain')
    expect(resolveTreatment('inherit', 'framed', 'cutout')).toBe('plain')
  })

  it('the placement sets are as recorded for Phase 13', () => {
    expect(ALLOWED_TREATMENTS.contentMedia).toEqual(RESOLVED_TREATMENTS)
    expect(ALLOWED_TREATMENTS.sectionBackground).toEqual(['scrim', 'tint'])
    expect(ALLOWED_TREATMENTS.attorneyCard).toEqual(['plain', 'framed', 'rounded'])
    expect(resolveTreatment('plain', null, 'sectionBackground')).toBe('scrim')
    expect(resolveTreatment('slab', null, 'attorneyCard')).toBe('plain')
  })

  it('tint renders plain on a dark surface, except as a section background', () => {
    expect(resolveTreatment('tint', null, 'contentMedia', 'dark')).toBe('plain')
    // Phase 15: the accent fill is the ground, so the accent wash reads nothing.
    expect(resolveTreatment('tint', null, 'contentMedia', 'saturated')).toBe('plain')
    expect(resolveTreatment('tint', null, 'contentMedia', 'light')).toBe('tint')
    expect(resolveTreatment('tint', null, 'contentMedia')).toBe('tint')
    expect(resolveTreatment('tint', null, 'sectionBackground', 'dark')).toBe('tint')
    expect(resolveTreatment('tint', null, 'sectionBackground', 'saturated')).toBe('tint')
  })
})

describe('TREATMENT_CLASSES', () => {
  it('has a wrapper and an image class list for every resolved treatment', () => {
    for (const t of RESOLVED_TREATMENTS) {
      expect(treatmentClasses(t).wrapper.length, t).toBeGreaterThan(0)
      expect(treatmentClasses(t).image.length, t).toBeGreaterThan(0)
    }
  })

  it('every class resolves through Tailwind (the class checker cannot see a TS map)', () => {
    expect(findUnknown(everyClass(), designSystem, plainCss)).toEqual([])
  })

  it('the oracle is live: a class that does not exist is reported', () => {
    expect(findUnknown(['rounded-ui-lg', 'after:border-acent'], designSystem, plainCss)).toHaveLength(2)
  })

  it('carries no literal colour (tokens only, so the cascade swaps and provisioning never see a literal)', () => {
    const literal = /\[(?:#|rgb|hsl|oklch|color:)/
    expect(everyClass().filter((c) => literal.test(c))).toEqual([])
  })

  it('reads the colour roles the record names: decor (the accent) for framed and tint, brand-dark for slab and scrim', () => {
    expect(TREATMENT_CLASSES.framed.wrapper).toContain('after:border-decor')
    expect(TREATMENT_CLASSES.tint.wrapper).toContain('after:bg-decor/20')
    expect(TREATMENT_CLASSES.slab.wrapper).toContain('before:bg-brand-dark')
    expect(TREATMENT_CLASSES.scrim.wrapper).toContain('after:from-brand-dark/80')
    expect(TREATMENT_CLASSES.rounded.wrapper).toContain('rounded-ui')
  })
})

// ─── Phase 13's two placements (WS-V1-PHASE13-DESIGN §7 amendment 8) ──────────
//
// Requirement 6 as written would have changed a live band on every client, so it
// is narrowed here and the narrowing is pinned.

describe('the section background (Phase 13)', () => {
  it('keeps today’s FLAT scrim, so no existing image band moves', () => {
    // `SectionShell` renders `<div class="absolute inset-0 bg-brand-dark/80">`.
    // The `scrim` treatment Phase 11 shipped is a GRADIENT
    // (`after:bg-linear-to-t after:from-brand-dark/80`), so applying it to a
    // section background would have re-scrimmed every image band on every
    // client — against Phase 11 amendment 4's own promise. The treatment is
    // therefore NOT applied to section backgrounds in Phase 13.
    expect(TREATMENT_CLASSES.scrim.wrapper).toContain('after:bg-linear-to-t')
    expect(TREATMENT_CLASSES.scrim.wrapper).not.toContain('bg-brand-dark/80 ')
  })

  it('tint on a section background removes the dark wash, which is why it is cut', () => {
    // `resolveTreatment` deliberately EXEMPTS sectionBackground from the
    // tint-to-plain guard, so a tint there is a 20%-accent multiply with no dark
    // wash at all, and the band's white text would sit on a bare photograph.
    expect(resolveTreatment('tint', null, 'sectionBackground', 'dark')).toBe('tint')
    expect(resolveTreatment('tint', null, 'sectionBackground', 'saturated')).toBe('tint')
    expect(TREATMENT_CLASSES.tint.wrapper).not.toContain('brand-dark')
  })
})

describe('the attorney card photo (Phase 13)', () => {
  it('offers plain and framed; rounded is deferred with its reason', () => {
    // `rounded` puts 8px on all four corners of a photo box sitting flush inside
    // a `rounded-ui overflow-hidden` card, so the bottom two corners show two
    // notches of card background. It needs `rounded-t-ui` — a PLACEMENT argument
    // `resolveTreatment(value, siteDefault, context)` has nowhere to put.
    expect(ALLOWED_TREATMENTS.attorneyCard).toEqual(['plain', 'framed', 'rounded'])
    expect(resolveTreatment('framed', null, 'attorneyCard')).toBe('framed')
    expect(resolveTreatment('slab', null, 'attorneyCard')).toBe('plain')
  })

  it('framed is a wrapper ::after border, so it adds no element and cannot move the photo', () => {
    expect(TREATMENT_CLASSES.framed.wrapper).toContain('after:absolute')
    expect(TREATMENT_CLASSES.framed.wrapper).toContain('after:border-decor')
    expect(TREATMENT_CLASSES.framed.image).toBe(TREATMENT_CLASSES.plain.image)
  })

  it('an absent or inherit treatment is plain, which is exactly today’s markup', () => {
    for (const v of [null, undefined, 'inherit'] as const) {
      expect(resolveTreatment(v, 'plain', 'attorneyCard')).toBe('plain')
    }
  })
})
