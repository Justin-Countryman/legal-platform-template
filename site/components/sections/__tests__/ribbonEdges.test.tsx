import {describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'

// ─── A ribbon's accent line (Phase 17E) ────────────────────────────────────────
//
// Monorepo WS-V1-PHASE17E-DESIGN §2.12, `[R-576]`. A ribbon on the ground of the band above it (the hero,
// for the first band) or below it (the close, for the last) reads as that band's last line; it draws an
// accent line on each such edge so it reads as a strip. A ribbon on a ground of its own draws none, so
// Ribbon rhythm's filled strips are unchanged; a theme with a hairline at every band has drawn the line;
// an interior page runs no theme; a panel floats and is a strip already.

import {walkPage, NO_SEAM, type SiteLook} from '../sectionFrame'
import {SectionShell, type SectionAppearance} from '../SectionShell'
import {flowById, type Host} from '@/lib/flows'
import {LOOK} from './flowFixtures'
import {type VisibleGround} from '@/lib/sectionSurface'

type Band = {host: Host | null; appearance?: SectionAppearance | null}
const b = (host: Host | null, appearance?: SectionAppearance): Band => ({host, appearance})
// A ribbon is a content section, the one type the accent fill may paint.
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: !!m.appearance?.surface, host: m.host, content: m.host === 'ribbon' || m.host === 'narrative' || m.host === 'split' || m.host === 'statement'})
/** Each band as `t`, `b` or `tb` for the edges it lines, `-` for none. */
const edges = (bands: Band[], flow: string | null, hero: VisibleGround | null = 'dark', close: VisibleGround | null = 'dark', site: Partial<SiteLook> = {}) =>
  walkPage(bands, resolveBand, {...LOOK, flow: flow ? flowById(flow)! : null, ...site}, hero, close)
    .bands.map(({seam}) => (seam.ribbonEdges ? `${seam.ribbonEdges.top ? 't' : ''}${seam.ribbonEdges.bottom ? 'b' : ''}` : '-'))
    .join(' ')

describe('a ribbon lines the edge it shares with its neighbor’s ground', () => {
  it('under Quiet, below the opening ribbon and above the coda, the light page’s two joins', () => {
    // A dark hero and a dark close around a light page: each ribbon shares one edge, with the band inside the page.
    expect(edges([b('ribbon'), b('narrative'), b('split'), b('ribbon')], 'quiet.mostlyLight')).toBe('b - - t')
  })

  it('a stored ribbon, as on a homepage an operator built, on the hero’s own ground lines its top', () => {
    expect(edges([b('ribbon', {surface: 'dark'}), b('narrative'), b('ribbon', {surface: 'dark'})], 'quiet.mostlyLight')).toBe('t - b')
  })

  it('a ribbon between two bands of its ground lines both edges, and light and tint are one ground', () => {
    expect(edges([b('narrative'), b('ribbon', {surface: 'tint'}), b('split')], 'quiet.mostlyLight')).toBe('- tb -')
  })

  it('a ribbon on a ground of its own lines nothing: Ribbon rhythm’s filled strips are unchanged', () => {
    const out = edges([b('ribbon'), b('narrative'), b('split'), b('ribbon')], 'ribbonRhythm.mostlyLight', 'dark', 'dark', {saturated: true})
    expect(out).toBe('- - - -')
    // Where the palette cannot carry the fill, the theme paints its ribbons dark, as the hero and the close: then they
    // share those edges and draw the line.
    expect(edges([b('ribbon'), b('narrative'), b('split'), b('ribbon')], 'ribbonRhythm.mostlyLight', 'dark', 'dark', {saturated: false})).toBe('t - - b')
  })

  it('never where the theme draws its hairline at every band (Type on black, Editorial): that is the line', () => {
    expect(edges([b('ribbon'), b('narrative'), b('ribbon')], 'typeOnBlack.allDark')).toBe('- - -')
    expect(edges([b('ribbon'), b('narrative'), b('ribbon')], 'editorial.mostlyLight', 'light', 'light')).toBe('- - -')
  })

  it('only a ribbon: a band of another host on its neighbor’s ground draws nothing new', () => {
    expect(edges([b('narrative'), b('split'), b('statement')], 'quiet.mostlyLight')).toBe('- - -')
  })

  it('an interior page runs no theme, so none', () => {
    expect(edges([b('narrative'), b('ribbon'), b('split')], null)).toBe('- - -')
  })
})

describe('the band draws the line', () => {
  const classes = (appearance: SectionAppearance | undefined, ribbonEdges: {top: boolean; bottom: boolean}) =>
    (render(<SectionShell appearance={appearance} seam={{...NO_SEAM, site: LOOK, ribbonEdges}}>A ribbon</SectionShell>).container.firstElementChild as HTMLElement).className.split(/\s+/)

  it('as a class per edge, the accent’s box shadow in the stylesheet', () => {
    expect(classes(undefined, {top: true, bottom: false})).toContain('ribbon-edge-top')
    expect(classes(undefined, {top: true, bottom: false})).not.toContain('ribbon-edge-bottom')
    expect(classes(undefined, {top: true, bottom: true})).toEqual(expect.arrayContaining(['ribbon-edge-top', 'ribbon-edge-bottom']))
  })

  it('never on a panel, which floats on its gutter', () => {
    expect(classes({inset: true}, {top: true, bottom: true}).filter((c) => c.startsWith('ribbon-edge'))).toEqual([])
  })
})
