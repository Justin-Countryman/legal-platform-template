import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// ─── Photo scrims: the theme's set of photographs (Phase 17E) ──────────────────
//
// Monorepo WS-V1-PHASE17E-DESIGN §2, rulings `[R-573]`, `[R-574]`. Beside an approved hero photograph
// only, the close takes the set's first photograph and runs of one to three dark bands the pass filled
// take the rest in page order, one photograph a run, never beside another photograph; a run is text-led
// bands, and the practice areas beside a text band when their cards carry no photographs; each
// photograph once, never the hero's own, only while approved. A run is drawn once, behind its bands, by
// the canvas; a phone gets its own source, at the run's head.

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
  ScrollReveal: ({children}: {children: React.ReactNode}) => <div data-reveal>{children}</div>,
}))

import {HomepageCanvas, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {HomeBody} from '@/components/layout/HomeBody'
import {walkFrame, interiorLook, closeFrame, type SiteLook} from '../sectionFrame'
import {setPhotoUrls} from '../SetPhoto'
import {type SectionAppearance} from '../SectionShell'
import {flowById, type Host} from '@/lib/flows'
import {photoSetOf, setAssetIds, setPhotoEntries, type HeroPhoto, type SetPhoto} from '@/lib/heroGround'
import {planPreview} from '@/lib/preview/plan'
import {LOOK} from './flowFixtures'

const HERO: HeroPhoto = {src: 'https://cdn.example.com/hero.jpg', width: 2400, height: 1600, hotspot: null, assetId: 'image-hero-2400x1600-jpg'}
const SCRIMS = flowById('photoScrims.mostlyDark')!
const photo = (name: string, w = 2400, h = 1600): SetPhoto => ({image: {asset: {_ref: `image-${name}-${w}x${h}-jpg`}}, assetId: `image-${name}-${w}x${h}-jpg`, width: w, height: h})
const SET = ['a', 'b', 'c', 'd'].map((n) => photo(n))

type Band = {host: Host | null; appearance?: SectionAppearance | null; cardPhotos?: boolean}
const b = (host: Host | null, over: Partial<Band> = {}): Band => ({host, ...over})
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: !!m.appearance?.surface, host: m.host, cardPhotos: m.cardPhotos})
/** Every band dark (all dark rules on Photo scrims' paint), so the set's own gates are what a case reads. */
const ALL_DARK = {...SCRIMS, dark: {...SCRIMS.dark, budget: 'all' as const, hosts: [...SCRIMS.dark.hosts, 'differentiators', 'areas'] as Host[]}}
const walk = (bands: Band[], site: Partial<SiteLook> = {}) =>
  walkFrame(bands, resolveBand, {...LOOK, flow: ALL_DARK, heroPhoto: HERO, photoSet: SET, closeShown: true, ...site}, 'image')
/** Each band as its photograph's letter, `-` a plain dark band, `w` a window of the hero's photograph. */
const letters = (bands: Band[], site: Partial<SiteLook> = {}) =>
  walk(bands, site).map((o) => {
    const p = o.seam.paint
    if (p?.photo) return (site.photoSet ?? SET)[p.photo.index].assetId.split('-')[1]
    if (p?.window) return 'w'
    return p?.ground === 'dark' ? '-' : `(${o.seam.paint?.ground ?? 'own'})`
  }).join(' ')

describe('the set, read from Design Settings', () => {
  const raw = (ref: string, over: Record<string, unknown> = {}) => ({asset: {_ref: ref}, width: 2400, height: 1600, isOpaque: true, assetId: ref, ...over})
  it('says for every photograph whether it draws, and why not', () => {
    const tokens = {
      themePhotos: [
        raw('image-a-2400x1600-jpg'), raw('image-b-2400x1600-jpg'), raw('image-a-2400x1600-jpg'), raw('image-hero-2400x1600-jpg'),
        raw('image-small-1200x800-jpg', {width: 1200, height: 800}), raw('image-tall-1600x1600-jpg', {width: 1600, height: 1600}),
        raw('image-png-2400x1600-png', {isOpaque: false}),
        // Cropped to a portrait by the operator: its size once cropped is what the guard reads.
        raw('image-crop-4000x2000-jpg', {width: 4000, height: 2000, crop: {top: 0, bottom: 0, left: 0.25, right: 0.25}}),
      ],
      flowPhotos: ['image-a-2400x1600-jpg', 'image-small-1200x800-jpg', 'image-crop-4000x2000-jpg'],
    }
    expect(setPhotoEntries(tokens, HERO.assetId).map((e) => e.status)).toEqual(['approved', 'notApproved', 'duplicate', 'hero', 'small', 'portrait', 'transparent', 'portrait'])
    expect(photoSetOf(tokens, HERO.assetId).map((p) => p.assetId)).toEqual(['image-a-2400x1600-jpg'])
    expect(photoSetOf({}, HERO.assetId)).toEqual([])
  })
  it('the preview approves every photograph of the set, sorted and each once', () => {
    expect(setAssetIds({themePhotos: [raw('image-z-1-jpg'), raw('image-a-1-jpg'), raw('image-z-1-jpg')]})).toEqual(['image-a-1-jpg', 'image-z-1-jpg'])
    expect(setAssetIds({})).toEqual([])
  })
})

describe('where the set goes', () => {
  it('only beside an approved hero photograph: without one, no photograph at all', () => {
    expect(letters([b('areas'), b('narrative'), b('split')], {heroPhoto: null})).toBe('- - -')
  })

  it('the close takes the first photograph; runs of one to three text-led bands take the rest in order, one a run', () => {
    // 0 under the photo hero; 1 to 3 a run of three; 4 beside it; 5 beside the photo close.
    expect(letters([b('statement'), b('narrative'), b('split'), b('testimonials'), b('statement'), b('narrative')])).toBe('- b b b - -')
    const close = closeFrame('photo', {...LOOK, flow: SCRIMS, heroPhoto: HERO, photoSet: SET})
    expect(close.seam?.paint?.photo).toEqual({index: 0, at: 0, length: 1})
  })

  it('a run is never longer than three, and two runs are never adjacent', () => {
    const seven = Array.from({length: 7}, () => b('narrative'))
    expect(letters([b('areas'), ...seven, b('areas')], {closeShown: false})).toBe('- a a a - b b b -')
  })

  it('with the close hidden, the first photograph goes to the first run', () => {
    expect(letters([b('areas'), b('narrative'), b('areas')], {closeShown: false})).toBe('- a a')
  })

  it('the practice areas join a run beside a text band; a grid alone, the attorneys, case results and a grid of photo cards never', () => {
    expect(letters([b('areas'), b('narrative'), b('areas'), b('areas')], {closeShown: false})).toBe('- a a a')
    expect(letters([b('ribbon'), b('areas'), b('ribbon'), b('attorneys'), b('caseResults'), b('statRow')], {closeShown: false})).not.toMatch(/[a-d]/)
    expect(letters([b('ribbon'), b('narrative'), b('areas', {cardPhotos: true}), b('ribbon')], {closeShown: false})).toBe('- a - -')
    expect(letters([b('ribbon'), b('narrative'), b('attorneys'), b('ribbon')], {closeShown: false})).toBe('- a - -')
  })

  it('fewer photographs than places leave the later places plain; each photograph once', () => {
    const places = [b('areas'), b('narrative'), b('ribbon'), b('narrative'), b('ribbon'), b('narrative'), b('ribbon')]
    expect(letters(places, {photoSet: SET.slice(0, 2)})).toBe('- b - - - - -')
    expect(letters(places, {photoSet: SET})).toBe('- b - c - d -')
  })

  it('never beside an operator’s Image band', () => {
    const own: SectionAppearance = {surface: 'image'}
    expect(letters([b('areas'), b('narrative'), b('split', {appearance: own}), b('narrative'), b('areas')], {closeShown: false})).toBe('- - (own) - -')
  })

  it('a set that can place nothing gives way to the hero’s windows', () => {
    expect(letters([b('areas'), b('ribbon'), b('narrative')], {closeShown: false, photoSet: SET})).toBe('- - a')
    expect(letters([b('areas'), b('ribbon'), b('attorneys')], {closeShown: false, photoSet: SET})).toBe('- - -')
    expect(letters([b('areas'), b('narrative'), b('attorneys'), b('split')], {closeShown: false, photoSet: [photo('x')].slice(0, 0)})).toBe('- w - w')
  })

  it('reaches no interior page', () => {
    expect(interiorLook({...LOOK, flow: SCRIMS, heroPhoto: HERO, photoSet: SET})?.photoSet).toBeNull()
  })
})

// ─── What the canvas and the shell draw ────────────────────────────────────────

const content = (key: string, layout: string, heading: string): HomepageBlock =>
  ({_type: 'contentSectionInline', _key: key, layout, heading, body: [{_type: 'block', _key: `${key}-b`, children: [{_type: 'span', _key: `${key}-s`, text: 'Plain words.'}]}]}) as unknown as HomepageBlock
// Under Photo scrims at mostly dark the ribbon, then the narrative, split and statements go dark: the first band sits
// under the photo hero, the next three make a run, the last sits beside the close.
const CANVAS: HomepageBlock[] = [
  content('a', 'ribbon', 'A line'), content('b', 'twoColumnText', 'Second'), content('c', 'split', 'Third'),
  content('d', 'statement', 'Fourth'), content('e', 'ribbon', 'Another line'), content('f', 'statement', 'Sixth'),
]

describe('a run, as the canvas draws it', () => {
  const site: SiteLook = {...LOOK, flow: {...SCRIMS, dark: {...SCRIMS.dark, budget: 'all'}}, heroPhoto: HERO, photoSet: SET, closeShown: true}
  const {container} = render(<HomepageCanvas blocks={CANVAS} site={site} hero="image" close="image" />)
  const runs = [...container.querySelectorAll('[data-photo-run]')]
  const loose = [...container.querySelectorAll('section')].filter((s) => !s.closest('[data-photo-run]'))

  it('one wrapper a run, on the navy ground, holding its bands outside their reveal', () => {
    expect(runs).toHaveLength(1)
    const run = runs[0]
    expect(run.className.split(' ')).toEqual(expect.arrayContaining(['relative', 'isolate', 'bg-brand-dark']))
    expect(run.querySelectorAll('section')).toHaveLength(3)
    expect(run.querySelectorAll('picture')).toHaveLength(1)
    expect(run.querySelector('[data-reveal] [data-photo-set]')).toBeNull()
  })

  it('its bands paint no ground and are Image sections as built by hand', () => {
    for (const s of runs[0].querySelectorAll('section')) {
      expect(s.className.split(' ')).not.toContain('bg-brand-dark')
      expect(s.getAttribute('data-scrim')).toBe('true')
      expect(s.getAttribute('data-ring-context')).toBe('dark')
      expect(s.querySelector('[data-photo-set]')).toBeNull()
    }
    expect(runs[0].querySelector('.bg-scrim\\/80')).not.toBeNull()
  })

  it('its photograph is drawn at the run’s head on a phone', () => {
    expect(runs[0].querySelector('[data-photo-set]')!.className.split(' ')).toContain('photo-run-head')
  })

  it('outside a run nothing is drawn: the bands under the hero and beside the close are the plain dark ground', () => {
    expect(loose).toHaveLength(3)
    for (const s of loose) expect(s.querySelector('[data-photo-set]')).toBeNull()
  })
})

describe('the photograph, as served', () => {
  const one: SiteLook = {...LOOK, flow: {...SCRIMS, dark: {...SCRIMS.dark, budget: 'all'}}, heroPhoto: HERO, photoSet: SET, closeShown: false}
  // A single text band between two ribbons: a run of one, drawn in its own section.
  const blocks = [content('a', 'ribbon', 'A line'), content('b', 'twoColumnText', 'Alone'), content('c', 'ribbon', 'Another')]
  const {container} = render(<HomepageCanvas blocks={blocks} site={one} hero="image" />)
  const band = [...container.querySelectorAll('section')].find((s) => s.querySelector('[data-photo-set]'))!

  it('a run of one draws in its own section, not a wrapper', () => {
    expect(container.querySelector('[data-photo-run]')).toBeNull()
    expect(band.getAttribute('data-scrim')).toBe('true')
    expect(band.className.split(' ')).toContain('bg-brand-dark')
  })

  it('a plain `<picture>`: a phone source of its own, the wide image lazy, low priority, decorative, grayscale', () => {
    const {phone, wide} = setPhotoUrls(SET[0])
    const source = band.querySelector('picture source')!
    expect(source.getAttribute('media')).toBe('(max-width: 767px)')
    expect(source.getAttribute('srcset')).toBe(phone)
    const img = band.querySelector('picture img')!
    expect(img.getAttribute('src')).toBe(wide)
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.getAttribute('fetchpriority')).toBe('low')
    expect(img.getAttribute('decoding')).toBe('async')
    expect(img.getAttribute('alt')).toBe('')
    expect(img.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(img.className.split(' ')).toEqual(expect.arrayContaining(['set-photo', 'object-cover', 'grayscale']))
  })

  it('served small and gray from the image CDN, the phone a crop at the focal point, the operator’s crop honored', () => {
    const {phone, wide} = setPhotoUrls(SET[0])
    for (const [k, v] of [['q', '35'], ['sat', '-100'], ['auto', 'format']]) {
      expect(new URL(phone).searchParams.get(k)).toBe(v)
      expect(new URL(wide).searchParams.get(k)).toBe(v)
    }
    expect(new URL(wide).searchParams.get('w')).toBe('960')
    expect(new URL(wide).searchParams.get('fit')).toBe('max')
    expect(new URL(phone).searchParams.get('w')).toBe('480')
    expect(new URL(phone).searchParams.get('h')).toBe('600')
    expect(new URL(phone).searchParams.get('fit')).toBe('crop')
    const cropped = setPhotoUrls({...SET[0], image: {...SET[0].image, crop: {top: 0, bottom: 0.1, left: 0.1, right: 0}}})
    expect(new URL(cropped.wide).searchParams.get('rect')).toBeTruthy()
  })
})

// ─── The page ─────────────────────────────────────────────────────────────────

const HERO_DESIGN = {skeleton: 'overlay', backdrop: 'image', backgroundImage: {...HERO, isOpaque: true}}
const rawSet = (...names: string[]) => names.map((n) => ({asset: {_ref: `image-${n}-2400x1600-jpg`}, width: 2400, height: 1600, isOpaque: true, assetId: `image-${n}-2400x1600-jpg`}))
function page(tokens: Record<string, unknown>, heroDesign: Record<string, unknown> = HERO_DESIGN) {
  const chrome = {designTokens: {flow: 'photoScrims.mostlyDark', flowPhoto: HERO.assetId, ...tokens}, globalCta: {heading: 'Talk to us today', layout: 'centered'}, header: {siteSettings: {firmName: 'Example Law Firm'}}}
  const all = {page: {hero: {heading: 'Counsel you can call'}, canvas: CANVAS}, heroDesign}
  const {container} = render(<HomeBody chrome={chrome as never} all={all as never} />)
  const sections = [...container.querySelectorAll('section')]
  return {
    shown: [...container.querySelectorAll('[data-photo-set]')].map((el) => (el.getAttribute('data-photo-set') ?? '').split('-')[1]),
    windows: container.querySelectorAll('[data-photo-window]').length,
    close: sections[sections.length - 1],
  }
}

describe('the page draws only the photographs approved with the theme ([R-574])', () => {
  it('approved: the close takes the first, the run the second', () => {
    const p = page({themePhotos: rawSet('a', 'b', 'c'), flowPhotos: ['image-a-2400x1600-jpg', 'image-b-2400x1600-jpg', 'image-c-2400x1600-jpg']})
    expect(p.windows).toBe(0)
    expect(p.close.querySelector('[data-photo-set]')!.getAttribute('data-photo-set')).toBe('image-a-2400x1600-jpg')
    expect(p.shown).toEqual(['b', 'a'])
  })

  it('a photograph added or replaced after Apply waits; the approved ones keep showing, each moving up a place', () => {
    const p = page({themePhotos: rawSet('new', 'b', 'c'), flowPhotos: ['image-b-2400x1600-jpg', 'image-c-2400x1600-jpg']})
    expect(p.shown).toEqual(['c', 'b'])
  })

  it('nothing approved: today’s windows of the hero’s photograph', () => {
    expect(page({themePhotos: rawSet('a', 'b')}).windows).toBeGreaterThan(0)
  })

  it('no hero photograph: no photograph anywhere, the close plain dark', () => {
    const p = page({themePhotos: rawSet('a', 'b'), flowPhotos: ['image-a-2400x1600-jpg', 'image-b-2400x1600-jpg']}, {skeleton: 'overlay', backdrop: 'none'})
    expect(p.shown).toEqual([])
    expect(p.close.getAttribute('data-scrim')).toBeNull()
  })
})

describe('the preview approves the set with the theme', () => {
  const doc = {_rev: 'r1', themePhotos: [{asset: {_ref: 'image-z-1-jpg'}}, {asset: {_ref: 'image-a-1-jpg'}}]}
  const scrims = {styleSet: 'site', palette: 'site', flow: 'photoScrims.mostlyDark'}
  it('sets `flowPhotos` sorted beside the hero’s photograph; a reorder of an approved set needs nothing', () => {
    expect(planPreview(doc, scrims, 'image-hero-1-jpg').set.flowPhotos).toEqual(['image-a-1-jpg', 'image-z-1-jpg'])
    expect(planPreview({...doc, flowPhotos: ['image-a-1-jpg', 'image-z-1-jpg']}, scrims, 'image-hero-1-jpg').set.flowPhotos).toBeUndefined()
  })
  it('clears it with any other theme, with no hero photograph, and with an empty set', () => {
    const approved = {...doc, flowPhotos: ['image-a-1-jpg', 'image-z-1-jpg']}
    expect(planPreview(approved, {...scrims, flow: 'cutBlocks.mostlyDark'}, 'image-hero-1-jpg').unset).toContain('flowPhotos')
    expect(planPreview(approved, scrims, null).unset).toContain('flowPhotos')
    expect(planPreview({...approved, themePhotos: []}, scrims, 'image-hero-1-jpg').unset).toContain('flowPhotos')
    expect(planPreview(doc, {...scrims, flow: 'cutBlocks.mostlyDark'}, 'image-hero-1-jpg').set.flowPhotos).toBeUndefined()
  })
})
