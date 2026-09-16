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
  TIGHT_SPACING,
  edgeCancelsSeam,
  sectionEdgeClasses,
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

  it('topNone is a single class at every preset: the overlap is the negative margin', () => {
    for (const [name, steps] of Object.entries(SECTION_SPACING)) expect(steps.topNone, name).toBe('pt-0')
    expect(TIGHT_SPACING.topNone).toBe('pt-0')
  })

  it('the tight preset is not a storable spacing (it exists only for cta/centered)', () => {
    expect(Object.keys(SECTION_SPACING)).toEqual(['compact', 'normal', 'spacious'])
    expect(`${TIGHT_SPACING.top} ${TIGHT_SPACING.bottom}`).toBe('pt-10 md:pt-12 pb-10 md:pb-12')
  })
})

describe('sectionSurface', () => {
  it('pattern emits NO background class, so the page layer shows through', () => {
    expect(sectionSurface('pattern').surfaceClass).toBe('')
    expect(sectionSurface('pattern').ringContext).toBeUndefined()
    expect(sectionSurface('pattern').buttonContext).toBe('light')
    expect(sectionSurface('pattern').isImage).toBe(false)
  })

  it('every other surface is unchanged from before Phase 13', () => {
    expect(sectionSurface('dark')).toEqual({surfaceClass: 'bg-brand-dark', ringContext: 'dark', buttonContext: 'dark', isImage: false})
    expect(sectionSurface('image')).toEqual({surfaceClass: 'bg-brand-dark', ringContext: 'dark', buttonContext: 'dark', isImage: true})
    expect(sectionSurface('tint')).toEqual({surfaceClass: 'bg-hero-tint', ringContext: undefined, buttonContext: 'light', isImage: false})
    expect(sectionSurface('accent')).toEqual({surfaceClass: 'bg-muted', ringContext: undefined, buttonContext: 'light', isImage: false})
    expect(sectionSurface('muted')).toEqual(sectionSurface('accent'))
    expect(sectionSurface('light')).toEqual({surfaceClass: 'bg-background', ringContext: undefined, buttonContext: 'light', isImage: false})
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
    // (Phase 14; Phase 13 mapped it to tint, which seamed two different colours).
    ['muted', 'muted'],
    ['accent', 'muted'],
    ['pattern', 'page'],
    ['light', 'light'],
  ])('%s sees %s', (surface, ground) => {
    expect(visibleGround({surface: surface as never})).toBe(ground)
  })

  it.each([[null], [undefined]])('%s sees light, so an absent surface never invents a seam', (value) => {
    expect(visibleGround(value as never)).toBe('light')
    expect(visibleGround({surface: value as never})).toBe('light')
  })

  it('an inset band sees the page ground whatever its own surface is', () => {
    for (const surface of ['light', 'tint', 'dark', 'accent', 'image', 'pattern'] as const) {
      expect(visibleGround({surface, inset: true}), surface).toBe('page')
    }
  })

  it('two inset bands are a same-ground join even when their panels differ', () => {
    expect(visibleGround({surface: 'dark', inset: true})).toBe(visibleGround({surface: 'light', inset: true}))
  })
})

describe('sectionEdgeClasses', () => {
  it('flat, absent and null paint nothing', () => {
    for (const edge of ['flat', null, undefined] as const) expect(sectionEdgeClasses('light', edge)).toBe('')
  })

  it('angled paints a wedge in the previous band’s own ground colour', () => {
    expect(sectionEdgeClasses('light', 'angled')).toContain('before:bg-background')
    expect(sectionEdgeClasses('tint', 'angled')).toContain('before:bg-hero-tint')
    expect(sectionEdgeClasses('dark', 'angled')).toContain('before:bg-brand-dark')
  })

  it('paints nothing over a page or image ground: there is no solid colour to cut', () => {
    // `page` (pattern or inset): the page ground is already on both sides.
    expect(sectionEdgeClasses('page', 'angled')).toBe('')
    // `image`: the photo is a child element, not a background, so a wedge could
    // only inherit the brand-dark base and would match no part of the band above.
    expect(sectionEdgeClasses('image', 'angled')).toBe('')
  })

  it('is desktop-and-up, gated on clip-path support, and never eats clicks', () => {
    const classes = sectionEdgeClasses('dark', 'angled')
    for (const token of classes.split(/\s+/).filter((c) => c.startsWith('md:before:'))) {
      expect(token, 'every paint class is md: and up').toMatch(/^md:before:/)
    }
    expect(classes).toContain('md:before:pointer-events-none')
    expect(classes).toContain('md:supports-[not_(clip-path:polygon(0_0))]:before:hidden')
    expect(classes).toContain('md:before:bottom-full')
  })

  it('is capped at the compact preset’s own md top padding, so it cannot reach a heading', () => {
    // h-16 is 4rem = 64px; compact's md:pt-16 is also 4rem. WCAG 2.4.11 and
    // 1.4.12 both bind: a wedge taller than the padding it covers can obscure a
    // focused control or a heading.
    expect(sectionEdgeClasses('dark', 'angled')).toContain('md:before:h-16')
  })

  it('edgeCancelsSeam follows whether the edge actually paints', () => {
    expect(edgeCancelsSeam('dark', 'angled')).toBe(true)
    expect(edgeCancelsSeam('dark', 'flat')).toBe(false)
    // An edge that paints nothing must not cancel a seam it never filled.
    expect(edgeCancelsSeam('page', 'angled')).toBe(false)
    expect(edgeCancelsSeam('image', 'angled')).toBe(false)
    expect(edgeCancelsSeam(null, 'angled')).toBe(false)
  })
})

describe('the frame classes', () => {
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

  it('carries no literal colour: provisioning rewrites #1a1a1a, #4a4a4a and #666666', () => {
    const literal = /\[(?:#|rgb|hsl|oklch|color:)/
    expect([...ALL_FRAME_CLASSES].filter((c) => literal.test(c))).toEqual([])
  })
})
