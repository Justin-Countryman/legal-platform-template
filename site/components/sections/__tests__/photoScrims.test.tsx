import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// ─── Photo scrims: the hero's photograph in windows (Phase 17B session 6) ─────
//
// Record WS-V1-PHASE17B6-DESIGN §2, rulings `[R-530]` to `[R-533]`. The walk places a window of
// the hero's own photograph on at most two text-led dark bands the theme filled, never beside
// another photograph (the photo hero, an operator's Image band, another window, the photo close
// when it renders), never where it would strand an inset between two strong grounds; the shell
// draws it as a plain server image resolving the hero's own candidate URL, eager, under the band's
// own scrim; the page draws it only while the hero photograph is the one the theme was approved
// with, and the close shows the first window.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/image')>()),
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img src={src} alt={alt ?? ''} className={className} />,
}))
vi.mock('@/components/ui/ScrollReveal', () => ({
  ScrollReveal: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}))

import {getImageProps} from 'next/image'
import {HomepageCanvas, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {HomeBody} from '@/components/layout/HomeBody'
import {walkFrame, photoWindows, interiorLook, type SiteLook} from '../sectionFrame'
import {SectionShell, type SectionAppearance} from '../SectionShell'
import {HOSTS, flowById, type Host} from '@/lib/flows'
import type {HeroPhoto} from '@/lib/heroGround'
import {LOOK, themed} from './flowFixtures'

const PHOTO: HeroPhoto = {src: 'https://cdn.example.com/city.jpg', width: 2400, height: 1600, hotspot: null, assetId: 'image-abc-2400x1600-jpg'}
const SCRIMS = flowById('photoScrims.mostlyDark')!
/** Every band dark, so the photograph's own gates are what a case reads. */
const ALL_DARK = themed({dark: {budget: 'all', hosts: [...HOSTS], rhythm: 'runs', paint: 'heroPhoto', close: 'photo'}})

type Band = {host: Host | null; appearance?: SectionAppearance | null}
const b = (host: Host | null, appearance?: SectionAppearance | null): Band => ({host, appearance})
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: !!m.appearance?.surface, host: m.host})
const walk = (bands: Band[], site: Partial<SiteLook> = {}) =>
  walkFrame(bands, resolveBand, {...LOOK, flow: ALL_DARK, heroPhoto: PHOTO, ...site}, 'image')
const grounds = (bands: Band[], site: Partial<SiteLook> = {}) =>
  walk(bands, site).map((o) => o.seam.paint?.ground ?? `stored:${o.member.appearance?.surface ?? 'light'}`)

describe('where the photograph goes', () => {
  it('nowhere without a photograph: the paint falls back to the dark ground, as every paint does', () => {
    expect(grounds([b('narrative'), b('split'), b('narrative')], {heroPhoto: null})).toEqual(['dark', 'dark', 'dark'])
  })

  it('on text-led bands only, never beside another photograph, at most twice', () => {
    // 0: under the photo hero; 1: a grid; 2: a window; 3: beside it; 4: a window; 5: the cap, and
    // beside the photo close besides.
    const list = [b('statement'), b('areas'), b('narrative'), b('testimonials'), b('split'), b('narrative')]
    expect(grounds(list)).toEqual(['dark', 'dark', 'image', 'dark', 'image', 'dark'])
    // No grid, ribbon, attorneys or results band ever takes it.
    expect(grounds([b('areas'), b('ribbon'), b('attorneys'), b('caseResults'), b('badges'), b('statRow')])).toEqual(Array(6).fill('dark'))
  })

  it('reads the band below as well as above: the photo close counts only when it renders', () => {
    expect(grounds([b('areas'), b('narrative')], {closeShown: true})).toEqual(['dark', 'dark'])
    expect(grounds([b('areas'), b('narrative')], {closeShown: false})).toEqual(['dark', 'image'])
  })

  it('an operator’s Image band keeps its own photograph, is never a window, and counts as a photograph beside', () => {
    const own: SectionAppearance = {surface: 'image'}
    const out = walk([b('areas'), b('narrative'), b('split', own), b('narrative'), b('areas')])
    expect(out.map((o) => o.seam.paint?.ground ?? 'own')).toEqual(['dark', 'dark', 'own', 'dark', 'dark'])
    expect(out[2].seam.paint).toBeNull()
  })

  it('an operator’s inset Image panel counts as a photograph beside too (ADV-17B6-2 F3)', () => {
    const panel: SectionAppearance = {surface: 'image', inset: true}
    expect(walk([b('areas'), b('narrative'), b('split', panel), b('narrative'), b('areas')]).map((o) => o.seam.paint?.ground ?? 'own'))
      .toEqual(['dark', 'dark', 'own', 'dark', 'dark'])
  })

  it('never strands an inset between two strong grounds: both its neighbours stay dark, and it adopts the run ([R-501])', () => {
    const inset: SectionAppearance = {inset: true}
    const out = walk([b('areas'), b('narrative'), b('split', inset), b('statement'), b('areas')])
    expect(out.map((o) => o.seam.paint?.ground ?? 'inset')).toEqual(['dark', 'dark', 'inset', 'dark', 'dark'])
    expect(out[2].seam.insetGround).toBe('dark')
  })

  it('gives the bands the windows after the close’s, away from the hotspot', () => {
    const hotspot = {x: 0.8, y: 0.2}
    const out = walk([b('areas'), b('narrative'), b('areas'), b('split'), b('areas')], {heroPhoto: {...PHOTO, hotspot}})
    const wins = photoWindows(hotspot)
    expect(out.filter((o) => o.seam.paint?.window).map((o) => o.seam.paint!.window)).toEqual([wins[1], wins[2]])
    expect(wins).not.toContainEqual({x: 1, y: 0})
  })

  it('reaches no interior page', () => {
    expect(interiorLook({...LOOK, flow: SCRIMS, heroPhoto: PHOTO})?.heroPhoto).toBeNull()
  })
})

// ─── What the shell draws ──────────────────────────────────────────────────────

const content = (key: string, layout: string, heading: string, appearance?: SectionAppearance): HomepageBlock =>
  ({_type: 'contentSectionInline', _key: key, layout, heading, body: [{_type: 'block', _key: `${key}-b`, children: [{_type: 'span', _key: `${key}-s`, text: 'Plain words.'}]}], ...(appearance ? {appearance} : {})}) as unknown as HomepageBlock
// Under Photo scrims at mostly dark: the narrative, the split and the second statement go dark (a
// run around the narrative); the second statement and the split take the windows.
const CANVAS: HomepageBlock[] = [
  content('a', 'statement', 'First'), content('b', 'statement', 'Second'), content('c', 'twoColumnText', 'Third'),
  content('d', 'split', 'Fourth'), content('e', 'statement', 'Fifth'),
]
const heroCandidate = getImageProps({src: PHOTO.src, alt: '', fill: true, sizes: '100vw'}).props

describe('the window, as the shell draws it', () => {
  const {container} = render(<HomepageCanvas blocks={CANVAS} site={{...LOOK, flow: SCRIMS, heroPhoto: PHOTO}} hero="image" />)
  const bands = [...container.querySelectorAll('section')]
  const windows = bands.filter((s) => s.querySelector('[data-photo-window]'))

  it('draws two windows, each an Image section like one built by hand', () => {
    expect(windows).toHaveLength(2)
    for (const s of windows) {
      expect(s.getAttribute('data-scrim')).toBe('true')
      expect(s.getAttribute('data-ring-context')).toBe('dark')
      expect(s.className.split(' ')).toContain('bg-brand-dark')
      expect(s.querySelector('.bg-scrim\\/80')).not.toBeNull()
    }
  })

  it('draws the hero’s own candidate: the same src set and sizes, eager, decorative, one image a window', () => {
    for (const s of windows) {
      const imgs = s.querySelectorAll('img')
      expect(imgs).toHaveLength(1)
      const img = imgs[0]
      expect(img.getAttribute('srcset')).toBe(heroCandidate.srcSet)
      expect(img.getAttribute('src')).toBe(heroCandidate.src)
      expect(img.getAttribute('sizes')).toBe('100vw')
      expect(img.getAttribute('loading')).toBe('eager')
      expect(img.getAttribute('alt')).toBe('')
      expect(img.closest('[aria-hidden="true"]')).not.toBeNull()
      expect(img.className.split(' ')).toEqual(expect.arrayContaining(['photo-window', 'object-cover', 'grayscale']))
      expect(img.getAttribute('style')).toMatch(/--window-x: (0%|-100%); --window-y: (0%|-100%)/)
    }
  })

  it('draws nothing without the photograph, and the bands are the plain dark ground', () => {
    const plain = render(<HomepageCanvas blocks={CANVAS} site={{...LOOK, flow: SCRIMS, heroPhoto: null}} hero="image" />).container
    expect(plain.querySelector('[data-photo-window]')).toBeNull()
    expect(plain.querySelector('[data-scrim]')).toBeNull()
  })

  it('an inset Image panel carries the photo band’s mark itself, so its own dark ground cannot undo it (ADV-17B6-2 F1)', () => {
    const {container} = render(
      <SectionShell appearance={{surface: 'image', inset: true, backgroundImage: {asset: {_ref: 'image-abc-1200x800-jpg'}}}}>
        <p>A panel</p>
      </SectionShell>,
    )
    const panel = container.querySelector('section > div')!
    expect(panel.className.split(' ')).toContain('bg-brand-dark')
    expect(panel.getAttribute('data-scrim')).toBe('true')
    // A panel with no photograph is not a photo band.
    const plain = render(<SectionShell appearance={{surface: 'dark', inset: true}}><p>A panel</p></SectionShell>).container
    expect(plain.querySelector('section > div')!.getAttribute('data-scrim')).toBeNull()
  })

  it('the photo bands’ stars and dots read the scrim values, through `data-scrim` (the cascade block, `[R-533]`)', () => {
    // The block itself is held by `cascadeBlocks.test.ts`; here, that every window carries its trigger.
    expect(windows.every((s) => s.matches('[data-scrim="true"]'))).toBe(true)
  })
})

// ─── The page: the approved photograph and the close ──────────────────────────

const HERO_DESIGN = {skeleton: 'overlay', backdrop: 'image', backgroundImage: {...PHOTO, isOpaque: true}}
function page(designTokens: Record<string, unknown>, over: {hideCtaForm?: boolean} = {}) {
  const chrome = {designTokens, globalCta: {heading: 'Talk to us today', layout: 'centered'}, header: {siteSettings: {firmName: 'Example Law Firm'}}}
  const all = {page: {hero: {heading: 'Counsel you can call'}, canvas: CANVAS, ...over}, heroDesign: HERO_DESIGN}
  const {container} = render(<HomeBody chrome={chrome as never} all={all as never} />)
  const sections = [...container.querySelectorAll('section')]
  return {windows: sections.filter((s) => s.querySelector('[data-photo-window]')).length, close: sections[sections.length - 1]}
}

describe('the page draws only the photograph the theme was approved with ([R-532])', () => {
  it('the approved photograph: two windows and the close on the first window', () => {
    const p = page({flow: 'photoScrims.mostlyDark', flowPhoto: PHOTO.assetId})
    expect(p.windows).toBe(3)
    expect(p.close.textContent).toContain('Talk to us today')
    expect(p.close.getAttribute('data-scrim')).toBe('true')
    const w = photoWindows(null)[0]
    expect(p.close.querySelector('[data-photo-window]')!.getAttribute('data-photo-window')).toBe(`${w.x}${w.y}`)
  })

  it('a photograph replaced after Apply, or never approved: no window anywhere, and a dark close', () => {
    for (const tokens of [{flow: 'photoScrims.mostlyDark', flowPhoto: 'image-other-2400x1600-jpg'}, {flow: 'photoScrims.mostlyDark'}]) {
      const p = page(tokens)
      expect(p.windows).toBe(0)
      expect(p.close.className.split(' ')).toContain('bg-brand-dark')
      expect(p.close.getAttribute('data-scrim')).toBeNull()
    }
  })

  it('no other theme draws the photograph, approved or not', () => {
    expect(page({flow: 'cutBlocks.mostlyDark', flowPhoto: PHOTO.assetId}).windows).toBe(0)
  })
})
