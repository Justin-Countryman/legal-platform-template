import {__unstable__loadDesignSystem} from '@tailwindcss/node'
import fs from 'node:fs'
import path from 'node:path'
import {beforeAll, describe, expect, it} from 'vitest'

import {findUnknown, readPlainCssClasses} from '../../scripts/check-unknown-utility-classes.mjs'
import {
  ALL_FRAME_CLASSES,
  DEFAULT_SECTION_SPACING,
  DEFAULT_SECTION_SURFACE,
  SECTION_SPACING,
  SECTION_SURFACES,
  TIGHT_SPACING,
  sectionSurface,
  visibleGround,
} from '../sectionSurface'

// ─── The section frame ────────────────────────────────────────────────────────
//
// Phase 13 (monorepo WS-V1-PHASE13-DESIGN §7). Four things are pinned here, and
// the first is the one that matters most to every existing client.
//
// 1. ABSENT RENDERS EXACTLY AS IT DID. The composer and `migrate_canvas.py`
//    deliberately write no `surface` and no `spacing` (item 308, [R-450]), so
//    every band the build has ever written carries neither. `top + bottom` must
//    therefore reproduce the old single `py-*` string per breakpoint, or the
//    frame silently re-spaces every composed band on every client.
// 2. The ground mapping, which is what decides a seam.
// 3. The edge: who paints it, on which grounds it paints nothing, and its gates.
// 4. That every class in this module is a class Tailwind actually emits. The
//    classes live in TS objects, where `check-unknown-utility-classes` and
//    ESLint's `no-arbitrary-color` never look — the checker walks `.tsx` only AND
//    its extractor reads only JSX `className`, so a const map escapes it even in
//    a `.tsx` file (measured in the Phase 13 challenge with a planted class). So
//    this test asks the checker's own oracle directly, the way
//    `imageTreatment.test.ts` does.

const SITE_ROOT = path.resolve(__dirname, '../..')

let designSystem: {candidatesToCss: (names: string[]) => (string | null)[]}
let plainCss: Set<string>

beforeAll(async () => {
  designSystem = await __unstable__loadDesignSystem(fs.readFileSync(path.join(SITE_ROOT, 'app/globals.css'), 'utf8'), {
    base: SITE_ROOT,
  })
  plainCss = readPlainCssClasses(SITE_ROOT)
})

// The exact strings every band rendered before Phase 13, per spacing. If one of
// these changes, a composed band on a live client changes with it.
const BEFORE_PHASE_13: Record<string, string> = {
  compact:  'py-12 md:py-16',
  normal:   'py-16 md:py-24 lg:py-28',
  spacious: 'py-24 md:py-32 lg:py-40',
}

describe('SECTION_SPACING: absent renders exactly as it did', () => {
  it.each(Object.keys(BEFORE_PHASE_13))('%s: top + bottom reproduces the old py-* string per breakpoint', (spacing) => {
    const steps = SECTION_SPACING[spacing as keyof typeof SECTION_SPACING]
    // `py-16 md:py-24 lg:py-28` becomes pt-16/pb-16, md:pt-24/md:pb-24, …
    const expected = BEFORE_PHASE_13[spacing]
      .split(/\s+/)
      .flatMap((token) => {
        const [variant, util] = token.includes(':') ? token.split(':') : ['', token]
        const size = util.replace('py-', '')
        const prefix = variant ? `${variant}:` : ''
        return [`${prefix}pt-${size}`, `${prefix}pb-${size}`]
      })
    const actual = `${steps.top} ${steps.bottom}`.split(/\s+/)
    expect(actual.slice().sort()).toEqual(expected.slice().sort())
  })

  it('the default spacing is still normal, and the default surface still light', () => {
    expect(DEFAULT_SECTION_SPACING).toBe('normal')
    expect(DEFAULT_SECTION_SURFACE).toBe('light')
  })

  it('seamTop is a responsive triple, because one value cannot halve 64, 96 and 112', () => {
    expect(SECTION_SPACING.normal.seamTop).toBe('pt-8 md:pt-12 lg:pt-14')
    // Half of top, per breakpoint, at every preset.
    for (const [name, steps] of Object.entries(SECTION_SPACING)) {
      const tops = steps.top.split(/\s+/).length
      expect(steps.seamTop.split(/\s+/).length, name).toBe(tops)
    }
  })

  // Phase 16A, [R-475]: an overlapping panel keeps its phone padding (nothing
  // overlaps below md) and has none from md, where the negative margin is the
  // overlap; the band above grows its bottom by exactly the overlap from md.
  it('topOverlap is the preset on phones and zero from md', () => {
    for (const steps of [...Object.values(SECTION_SPACING), TIGHT_SPACING]) {
      expect(steps.topOverlap.split(' ')[0]).toBe(steps.top.split(' ')[0])
      expect(steps.topOverlap.split(' ').slice(1)).toEqual(['md:pt-0'])
    }
  })

  it('bottomBeforeOverlap adds exactly the overlap (48px small, 96px large) at every breakpoint from md', () => {
    const units = (cls: string, bp: string) => Number(cls.split(' ').find((c) => c.startsWith(bp))?.split('-').pop())
    for (const steps of [...Object.values(SECTION_SPACING), TIGHT_SPACING]) {
      for (const [size, add] of [['small', 12], ['large', 24]] as const) {
        const grown = steps.bottomBeforeOverlap[size]
        expect(grown.split(' ')[0], size).toBe(steps.bottom.split(' ')[0])
        for (const bp of ['md:pb-', 'lg:pb-']) {
          if (!steps.bottom.includes(bp)) continue
          expect(units(grown, bp), `${size} ${bp}`).toBe(units(steps.bottom, bp) + add)
        }
      }
    }
  })

  it('the tight preset is not a storable spacing (it exists only for cta/centered)', () => {
    expect(Object.keys(SECTION_SPACING)).toEqual(['compact', 'normal', 'spacious'])
    expect(`${TIGHT_SPACING.top} ${TIGHT_SPACING.bottom}`).toBe('pt-10 md:pt-12 pb-10 md:pb-12')
  })
})

describe('sectionSurface', () => {
  // Phase 16A ([R-472]): no site-wide layer. A pattern band paints the light
  // ground itself and asks the shell for the section texture; it is the only
  // surface that does.
  it('pattern paints the light ground and is the only textured surface', () => {
    expect(sectionSurface('pattern').surfaceClass).toBe('bg-background')
    expect(sectionSurface('pattern').ringContext).toBeUndefined()
    expect(sectionSurface('pattern').buttonContext).toBe('light')
    expect(sectionSurface('pattern').isImage).toBe(false)
    expect(SECTION_SURFACES.filter((surface) => sectionSurface(surface).textured)).toEqual(['pattern'])
  })

  // Phase 15: the table is keyed by the exported surface list, so a surface added
  // to the union without a case here fails rather than falling through to light.
  it('every surface in the union has a case, and none falls through to the default', () => {
    const expected: Record<(typeof SECTION_SURFACES)[number], ReturnType<typeof sectionSurface>> = {
      light:     {surfaceClass: 'bg-background',  ringContext: undefined,   buttonContext: 'light',     isImage: false, textured: false},
      tint:      {surfaceClass: 'bg-hero-tint',   ringContext: undefined,   buttonContext: 'light',     isImage: false, textured: false},
      muted:     {surfaceClass: 'bg-muted',       ringContext: undefined,   buttonContext: 'light',     isImage: false, textured: false},
      dark:      {surfaceClass: 'bg-brand-dark',  ringContext: 'dark',      buttonContext: 'dark',      isImage: false, textured: false},
      image:     {surfaceClass: 'bg-brand-dark',  ringContext: 'dark',      buttonContext: 'dark',      isImage: true,  textured: false},
      pattern:   {surfaceClass: 'bg-background',  ringContext: undefined,   buttonContext: 'light',     isImage: false, textured: true},
      saturated: {surfaceClass: 'bg-accent-fill', ringContext: 'saturated', buttonContext: 'saturated', isImage: false, textured: false},
    }
    expect(Object.keys(expected).sort()).toEqual([...SECTION_SURFACES].sort())
    for (const surface of SECTION_SURFACES) expect(sectionSurface(surface), surface).toEqual(expected[surface])
  })

  // The fill is a NAME for the anchored accent, not a new value (amendment 11):
  // the band, its edge and the top bar's accent strip all paint the same class,
  // and no cascade block re-declares it (`cascadeBlocks.test.ts`).
  it('the saturated band paints the accent fill and carries its own button context', () => {
    expect(sectionSurface('saturated').surfaceClass).toBe('bg-accent-fill')
    expect(sectionSurface('saturated').buttonContext).toBe('saturated')
    expect(ALL_FRAME_CLASSES).toContain('bg-accent-fill')
  })

  it('every other surface is unchanged from before Phase 13', () => {
    expect(sectionSurface('dark')).toEqual({surfaceClass: 'bg-brand-dark', ringContext: 'dark', buttonContext: 'dark', isImage: false, textured: false})
    expect(sectionSurface('image')).toEqual({surfaceClass: 'bg-brand-dark', ringContext: 'dark', buttonContext: 'dark', isImage: true, textured: false})
    expect(sectionSurface('tint')).toEqual({surfaceClass: 'bg-hero-tint', ringContext: undefined, buttonContext: 'light', isImage: false, textured: false})
    expect(sectionSurface('accent')).toEqual({surfaceClass: 'bg-muted', ringContext: undefined, buttonContext: 'light', isImage: false, textured: false})
    expect(sectionSurface('muted')).toEqual(sectionSurface('accent'))
    expect(sectionSurface('light')).toEqual({surfaceClass: 'bg-background', ringContext: undefined, buttonContext: 'light', isImage: false, textured: false})
  })

  it.each([[null], [undefined], ['not-a-surface']])('%s renders as light', (value) => {
    expect(sectionSurface(value as never).surfaceClass).toBe('bg-background')
  })
})

describe('visibleGround', () => {
  it.each([
    ['dark', 'dark'],
    ['image', 'image'],
    ['tint', 'tint'],
    // A stored `accent` renders bg-muted and is its own ground, as `muted` is
    // (Phase 14; Phase 13 mapped it to tint, which seamed two different colors).
    ['muted', 'muted'],
    ['accent', 'muted'],
    // The light ground wearing a faint texture: it joins a light band as one
    // ground (Phase 16A; it was its own `page` ground while a site-wide layer
    // could show through it).
    ['pattern', 'light'],
    ['light', 'light'],
    // Its own ground: two saturated bands join, and a band below it cuts its edge
    // in the fill rather than in the light ground.
    ['saturated', 'saturated'],
  ])('%s sees %s', (surface, ground) => {
    expect(visibleGround({surface: surface as never})).toBe(ground)
  })

  it.each([[null], [undefined]])('%s sees light, so an absent surface never invents a seam', (value) => {
    expect(visibleGround(value as never)).toBe('light')
    expect(visibleGround({surface: value as never})).toBe('light')
  })

  // The page around an inset panel is the light ground now that no site-wide
  // layer exists (Phase 16A), so a light band next to an inset band is one ground
  // and does not carry a doubled padding.
  it('an inset band sees the light ground whatever its own surface is', () => {
    for (const surface of [...SECTION_SURFACES, 'accent'] as const) {
      expect(visibleGround({surface, inset: true}), surface).toBe('light')
    }
    expect(visibleGround({surface: 'dark', inset: true})).toBe(visibleGround({surface: 'light'}))
  })

  it('two inset bands are a same-ground join even when their panels differ', () => {
    expect(visibleGround({surface: 'dark', inset: true})).toBe(visibleGround({surface: 'light', inset: true}))
  })
})

describe('the frame classes', () => {
  // Phase 16C: the divider's utilities and the spacing token it reads. `mt-divider` and
  // `h-divider` exist only because `--spacing-divider` is a theme variable, so they are
  // real utilities rather than arbitrary values ([R-463]).
  it('the divider utilities and its spacing token resolve', () => {
    expect(findUnknown(['divider-cut', 'divider-rise', 'divider-flip', 'mt-divider', 'h-divider'], designSystem, plainCss)).toEqual([])
  })

  it('every class resolves through Tailwind (neither checker can see a TS map)', () => {
    expect(findUnknown([...ALL_FRAME_CLASSES], designSystem, plainCss)).toEqual([])
  })

  it('the oracle is live: a class that does not exist is reported', () => {
    // `rounded-ui-lg` is deliberately in this list. It does NOT exist
    // (`UI_RADIUS_MAP` holds one value per site) and the record's requirement 1
    // asked for it; the challenge found that `rounded-[--radius-ui-lg]` resolves
    // but emits invalid CSS. Justin ruled `rounded-ui` on 2026-09-16.
    expect(findUnknown(['rounded-ui-lg', 'before:bg-backgrond', 'pt-nope'], designSystem, plainCss)).toHaveLength(3)
  })

  it('carries no literal color: provisioning rewrites #1a1a1a, #4a4a4a and #666666', () => {
    const literal = /\[(?:#|rgb|hsl|oklch|color:)/
    expect([...ALL_FRAME_CLASSES].filter((c) => literal.test(c))).toEqual([])
  })
})
