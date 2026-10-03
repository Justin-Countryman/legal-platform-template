import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'

// ─── Soft wash's second step (Phase 18 session E, monorepo `[R-598]`) ─────────
//
// Justin, of a warm firm's page: "design is all about continuity so we can't just use it in one spot". The step keeps
// Soft wash's white and cream bands and puts the palette's dark ground on a few of them by rule (monorepo
// WS-V1-PHASE18E-DESIGN §9.3): the positioning line under a light hero, then `quarter` of the bands below it, one in
// each equal stretch, nearest the stretch's middle; never two dark neighbours, the dark close counted after the last
// band; never the first band under a dark or photo hero, where it would only lengthen the hero. These tests drive the
// walk on planted bands and on every stub canvas, at both hero grounds.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img src={src} alt={alt ?? ''} className={className} />,
}))
vi.mock('@/components/ui/ScrollReveal', () => ({
  ScrollReveal: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}))

import {frameOf, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {walkPage} from '../sectionFrame'
import {type SectionAppearance} from '../SectionShell'
import {DARK_BUDGETS, DARK_RHYTHMS, FLOWS, closeOf, darkBudget, flowById, type FlowRules, type Host} from '@/lib/flows'
import {PALETTE_PRESETS, presetInputs} from '@/lib/palettes'
import {type VisibleGround} from '@/lib/sectionSurface'
import {LOOK} from './flowFixtures'
import {existsSync} from 'node:fs'
import {CI_DIR, RECORD_CANVASES, stubCanvas} from './stubCanvases'

const STEP = flowById('softWash.balanced')
const STRONG = new Set<VisibleGround | string>(['dark', 'saturated', 'image'])

type Band = {host: Host | null; appearance?: SectionAppearance | null}
const b = (host: Host | null, appearance?: SectionAppearance | null): Band => ({host, appearance})
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: !!m.appearance?.surface, host: m.host})

/** What a visitor sees on each band: the adopted ground of an inset, else the pass's, else the stored one. */
function seen<M>(members: readonly M[], resolve: Parameters<typeof walkPage<M>>[1], flow: FlowRules, hero: VisibleGround, close: VisibleGround | null = 'dark'): string[] {
  return walkPage(members, resolve, {...LOOK, flow}, hero, close).bands.map((o) => {
    const a = resolve(o.member).appearance
    return o.seam.insetGround ?? (a?.inset ? 'light' : o.seam.paint?.ground ?? a?.surface ?? 'light')
  })
}

describe('the step', () => {
  it('ships beside the first, passed by his eye (2026-10-02: "1, ship as shown"), in new words of the closed vocabulary', () => {
    expect(STEP).not.toBeNull()
    expect(STEP!.passed).toBe(true)
    expect(DARK_BUDGETS).toContain('quarter')
    expect(DARK_RHYTHMS).toContain('spread')
    expect(STEP!.dark).toMatchObject({budget: 'quarter', rhythm: 'spread', paint: 'plain', close: 'dark', closeElse: ['wash']})
    expect(STEP!.dark.hosts).toEqual(['ribbon', 'differentiators', 'narrative', 'testimonials', 'statement', 'caseResults', 'attorneys'])
    expect(STEP!.light.paint).toBe('washes')
    expect(STEP!.chrome).toEqual({header: 'light', footer: 'light'})
    expect(STEP!.needs).toEqual([])
    expect(flowById('softWash.mostlyLight')!.passed).toBe(true)
  })

  it('a quarter is one dark band at five or six bands, two at seven to ten, three at eleven to fourteen', () => {
    expect(Array.from({length: 17}, (_, n) => darkBudget('quarter', n))).toEqual(
      Array.from({length: 17}, (_, n) => Math.floor((n + 1) / 4)))
  })

  it('its close stands apart from the light footer on every preset, beside any light band above it', () => {
    for (const preset of PALETTE_PRESETS) {
      for (const above of ['light', 'wash', 'tint'] as const) {
        expect(closeOf(STEP, {footer: 'light', above, heroPhoto: false, colors: presetInputs(preset)}), `${preset.id} under ${above}`).toBe('dark')
      }
    }
  })
})

describe('where the dark ground goes', () => {
  const composer = [b('ribbon'), b('areas'), b('differentiators'), b('narrative'), b('attorneys'), b('ribbon')]

  it('under a light hero: the positioning line, then the band nearest the middle of the rest, then the close', () => {
    expect(seen(composer, resolveBand, STEP!, 'wash')).toEqual(['dark', 'wash', 'light', 'dark', 'wash', 'light'])
    expect(seen(composer, resolveBand, STEP!, 'tint')).toEqual(['dark', 'wash', 'light', 'dark', 'wash', 'light'])
  })

  it('under a dark or photo hero the first band stays light: a dark one would only lengthen the hero', () => {
    for (const hero of ['dark', 'image'] as const) {
      expect(seen(composer, resolveBand, STEP!, hero), hero).toEqual(['light', 'wash', 'light', 'dark', 'wash', 'light'])
    }
  })

  it('never darkens the band above a dark close, nor brackets an inset last band between them ([R-570])', () => {
    const bands = [b('split'), b('split'), b('split'), b('testimonials'), b('narrative', {inset: true})]
    const out = seen(bands, resolveBand, STEP!, 'dark')
    expect(out.at(-1)).toBe('light')
    expect(out.at(-2)).toBe('light')
  })

  it('a stretch already holding a stored strong band takes none', () => {
    const bands = [b('narrative'), b('narrative', {surface: 'dark'}), b('narrative'), b('narrative'), b('narrative'), b('narrative'), b('narrative')]
    // Seven bands under a dark hero: band 0 sits out, six below, one stretch, already holding the stored dark band.
    expect(seen(bands, resolveBand, STEP!, 'dark').filter((g) => g === 'dark')).toHaveLength(1)
  })

  it('a host the step does not name never goes dark', () => {
    expect(seen([b('areas'), b('badges'), b('areas'), b('badges'), b('areas')], resolveBand, STEP!, 'wash')).not.toContain('dark')
  })

  it('takes only what the step names: the first step is unchanged', () => {
    expect(seen(composer, resolveBand, flowById('softWash.mostlyLight')!, 'dark', 'wash')).not.toContain('dark')
  })
})

describe('on every stub canvas, at both hero grounds', () => {
  const CANVASES = (['fixture.ndjson', ...RECORD_CANVASES] as const).map((f) => [f, stubCanvas(f)] as const).filter(([, c]) => c)

  // A client tree has no stub canvases (the press prunes `scripts/ci/`), so the count is the
  // template's own check only, skipped by name there, as flowEngine.test.tsx's is (PR #41).
  it.skipIf(!existsSync(CI_DIR))('reads the canvases (skipped on a client tree: the stub datasets are pruned by the press)', () => {
    expect(CANVASES.length).toBeGreaterThanOrEqual(10)
  })

  for (const [file, canvas] of CANVASES) {
    for (const hero of ['wash', 'dark'] as const) {
      it(`${file} under a ${hero} hero: the dark color recurs down the page, never two together`, () => {
        const blocks = canvas!.blocks as HomepageBlock[]
        const shown = walkPage(blocks, frameOf, {...LOOK, flow: STEP!}, hero, 'dark').bands
        const grounds = seen(blocks, frameOf, STEP!, hero)
        const strong = grounds.map((g) => STRONG.has(g))
        const n = shown.length
        // The close is dark: no band beside it, and no two together anywhere.
        expect(strong.at(-1), 'the band above the close').toBe(false)
        strong.forEach((s, i) => { if (i > 0) expect(s && strong[i - 1], `bands ${i - 1} and ${i}`).toBe(false) })
        if (n >= 5) {
          // The dark ground appears below the first band, so it recurs whatever the hero.
          expect(strong.slice(1).some(Boolean), 'a dark band below the first').toBe(true)
          // No long light stretch: four light bands at most between dark ones (his premium pages' median run is 4).
          let run = 0
          let longest = 0
          for (const s of strong) { run = s ? 0 : run + 1; longest = Math.max(longest, run) }
          expect(longest, grounds.join(' ')).toBeLessThanOrEqual(4)
          // A few, not most: with the close, between a fifth and a half of the page's bands.
          const share = (strong.filter(Boolean).length + 1) / (n + 1)
          expect(share, grounds.join(' ')).toBeGreaterThanOrEqual(0.2)
          expect(share, grounds.join(' ')).toBeLessThanOrEqual(0.5)
        }
      })
    }
  }

  it('the roster carries the step once, with the light footer of its family', () => {
    expect(FLOWS.filter((f) => f.family === 'softWash').map((f) => f.id)).toEqual(['softWash.mostlyLight', 'softWash.balanced'])
  })
})
