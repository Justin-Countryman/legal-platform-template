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
    expect(resolveTreatment('tint', null, 'contentMedia', true)).toBe('plain')
    expect(resolveTreatment('tint', null, 'contentMedia', false)).toBe('tint')
    expect(resolveTreatment('tint', null, 'sectionBackground', true)).toBe('tint')
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

  it('reads the colour roles the record names: accent for framed and tint, brand-dark for slab and scrim', () => {
    expect(TREATMENT_CLASSES.framed.wrapper).toContain('after:border-accent')
    expect(TREATMENT_CLASSES.tint.wrapper).toContain('after:bg-accent/20')
    expect(TREATMENT_CLASSES.slab.wrapper).toContain('before:bg-brand-dark')
    expect(TREATMENT_CLASSES.scrim.wrapper).toContain('after:from-brand-dark/80')
    expect(TREATMENT_CLASSES.rounded.wrapper).toContain('rounded-ui')
  })
})
