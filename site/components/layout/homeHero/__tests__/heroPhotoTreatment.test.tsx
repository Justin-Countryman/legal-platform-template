import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

// THE HERO'S PHOTOGRAPH TAKES THE SITE'S ONE PHOTO TREATMENT (monorepo backlog 438). Found by the from-scratch test on
// 2026-10-08: `photoColor: tint` reached a content section's feature photo and a practice card's photo only, so the split
// hero's photograph showed in its own colors beside six tinted tiles. Where Design Settings sets a photo color, the hero
// marks the box holding only its photograph (`data-hero-photo`), every split media and both backdrops, and the photo color
// rules (`globals.css`) turn it gray and, under the tint, wash it in the accent as chosen, as the tiles are. Never the
// scrim, the text, the buttons, the play mark or the cut-out figure; on the backdrop the tint sits under the scrim, whose
// pairs still hold over every tinted pixel. A hero without a photo color is marked nowhere: its markup is as before.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img src={src} alt={alt ?? ''} className={className} />,
}))
vi.mock('@/components/ui/ButtonGroup', () => ({
  ButtonGroup: () => <div data-testid="button-group"><button type="button">Call us</button></div>,
  toCtaItems: (b: unknown) => b,
}))
vi.mock('@/components/ui/DialogPanel', () => ({DialogPanel: ({trigger}: {trigger: React.ReactNode}) => <>{trigger}</>}))
// The skeletons load through next/dynamic, which draws nothing under test: the dispatcher's case reads the props it hands.
vi.mock('next/dynamic', () => ({
  default: () => (props: {photoTreated?: boolean}) => <div data-testid="skeleton" data-treated={String(props.photoTreated)} />,
}))

import {Split} from '../skeletons/Split'
import {Overlay} from '../skeletons/Overlay'
import {HomepageHero} from '..'
import {resolveHeroConfig} from '../config'
import type {HeroConfig, ResolvedHomeContent} from '../types'
import type {ResolvedHeroSurface} from '@/lib/heroSurface'
import {photoBandPairs, resolvePalette, type ColorInputs} from '@/lib/designTokens'
import {PALETTE_PRESETS} from '@/lib/palettes'

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../../app/globals.css'), 'utf8')
const GRAY = ':is([data-photo-color="mono"], [data-photo-color="tint"]) [data-hero-photo] img'
const TINTED = '[data-photo-color="tint"] [data-hero-photo]'

const photo = {src: 'https://cdn.example.com/storefront.jpg', alt: 'A storefront', width: 1600, height: 1000}
const figure = {src: 'https://cdn.example.com/figure.png', alt: 'An attorney', width: 800, height: 1000}
const gallery = ['one', 'two', 'three'].map((n) => ({src: `https://cdn.example.com/${n}.jpg`, alt: `Gallery ${n}`}))

function surface(over: Partial<ResolvedHeroSurface> = {}): ResolvedHeroSurface {
  return {
    scheme: 'dark', isDark: true, bgImage: photo as never, hasImage: true, fit: 'cover', foreground: null, hasForeground: false,
    scrimOpacity: 80, scrimStyle: 'flat', scrimColor: 'auto', scrimDirection: 'auto', sectionBg: null, hasSectionBg: false, sectionBgFit: 'cover',
    ...over,
  }
}
const content = (over: Partial<ResolvedHomeContent> = {}): ResolvedHomeContent =>
  ({eyebrow: 'Since 1998', heading: 'Counsel you can call', description: 'A plain answer.', ctas: [{title: 'Call us'}] as never, galleryImages: [], videoUrl: null, ...over})
const config = (over: Partial<HeroConfig>): HeroConfig => ({...resolveHeroConfig({heading: 'Counsel you can call'} as never), ...over})

// Every hero layout that draws a photograph, and the photographs it draws.
const LAYOUTS: {name: string; el: (treated?: boolean) => React.ReactElement; photos: string[]}[] = [
  {name: 'split, contained panel', photos: ['A storefront'],
    el: (t) => <Split config={config({skeleton: 'split', splitImageStyle: 'contained'})} content={content()} surface={surface({scheme: 'light', isDark: false})} photoTreated={t} />},
  {name: 'split, natural ratio', photos: ['A storefront'],
    el: (t) => <Split config={config({skeleton: 'split', splitImageRatio: 'auto'})} content={content()} surface={surface()} photoTreated={t} />},
  {name: 'split, full-bleed half', photos: ['A storefront'],
    el: (t) => <Split config={config({skeleton: 'split', splitImageStyle: 'full'})} content={content()} surface={surface({scheme: 'light', isDark: false})} photoTreated={t} />},
  {name: 'split, collage', photos: ['Gallery one', 'Gallery two', 'Gallery three'],
    el: (t) => <Split config={config({skeleton: 'split', splitImageStyle: 'overlap'})} content={content({galleryImages: gallery as never})} surface={surface()} photoTreated={t} />},
  {name: 'split, card over the image', photos: ['A storefront'],
    el: (t) => <Split config={config({skeleton: 'split', textTreatment: 'overlap'})} content={content()} surface={surface()} photoTreated={t} />},
  {name: 'split, video poster', photos: ['A storefront'],
    el: (t) => <Split config={config({skeleton: 'split', splitMedia: 'video'})} content={content({videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'})} surface={surface()} photoTreated={t} />},
  {name: 'backdrop photograph, with the cut-out figure', photos: ['A storefront'],
    el: (t) => <Overlay config={config({skeleton: 'overlay', backdrop: 'image', foreground: true})} content={content()} surface={surface({foreground: figure as never, hasForeground: true})} photoTreated={t} />},
  {name: 'backdrop mosaic', photos: ['Gallery one', 'Gallery two', 'Gallery three'],
    el: (t) => <Overlay config={config({skeleton: 'overlay', backdrop: 'mosaic'})} content={content({galleryImages: gallery as never})} surface={surface()} photoTreated={t} />},
]

const alts = (imgs: Element[]) => imgs.map((i) => i.getAttribute('alt'))

describe('backlog 438: the hero photograph takes the site’s photo color', () => {
  for (const value of ['mono', 'tint'] as const) {
    it.each(LAYOUTS)(`under ${value}, $name: every photograph is gray, and nothing else is`, ({el, photos}) => {
      const {container} = render(<div data-photo-color={value}>{el(true)}</div>)
      const imgs = [...container.querySelectorAll('img')]
      expect(alts(imgs.filter((i) => i.matches(GRAY))).sort()).toEqual([...photos].sort())
      // The cut-out figure is a person: never treated.
      expect(alts(imgs.filter((i) => !i.matches(GRAY)))).toEqual(imgs.length > photos.length ? ['An attorney'] : [])
      for (const box of container.querySelectorAll('[data-hero-photo]')) {
        // The tint's layer is drawn on the box (`::after`) only under the tint, and the box holds the photograph alone.
        expect(box.matches(TINTED)).toBe(value === 'tint')
        expect(box.querySelectorAll('img').length).toBe(1)
        expect(box.querySelector('h1, p, a, button, svg, [data-testid="hero-scrim"], [data-testid="hero-foreground"]')).toBeNull()
        // Positioned, so the layer covers the photograph and no more.
        expect(box.className.split(' ').some((c) => c === 'relative' || c === 'absolute')).toBe(true)
      }
    })
  }

  it.each(LAYOUTS)('without a photo color, $name marks nothing', ({el}) => {
    for (const treated of [undefined, false]) {
      const {container, unmount} = render(<div>{el(treated)}</div>)
      expect(container.querySelector('[data-hero-photo]')).toBeNull()
      expect([...container.querySelectorAll('img')].some((i) => i.matches(GRAY))).toBe(false)
      unmount()
    }
  })

  it('unmarked, the photograph’s markup is as before: the natural panel unpositioned, the backdrop photograph drifting itself', () => {
    const natural = render(LAYOUTS[1].el()).container.querySelector('img')!.parentElement!
    expect(natural.className).toBe('overflow-hidden rounded-ui shadow-elevation-md')
    const backdrop = render(LAYOUTS[6].el()).container.querySelector('img[alt="A storefront"]')!
    expect(backdrop.className.split(' ')).toContain('hero-drift')
    // Marked, the photograph's box drifts and carries the tint with it.
    const marked = render(LAYOUTS[6].el(true)).container.querySelector('[data-hero-photo]')!
    expect(marked.className.split(' ')).toContain('hero-drift')
    expect(marked.querySelector('img')!.className.split(' ')).not.toContain('hero-drift')
  })

  it('on the backdrop the treated photograph sits under the scrim, and the play mark over the poster', () => {
    const {container} = render(<div data-photo-color="tint">{LAYOUTS[6].el(true)}</div>)
    const box = container.querySelector('[data-hero-photo]')!
    const scrim = container.querySelector('[data-testid="hero-scrim"]')!
    expect(box.compareDocumentPosition(scrim) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(box.contains(scrim)).toBe(false)
    const poster = render(<div data-photo-color="tint">{LAYOUTS[5].el(true)}</div>).container
    const mark = poster.querySelector('button > span')!
    expect(poster.querySelector('[data-hero-photo]')!.compareDocumentPosition(mark) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('the rules: gray under both values, the accent as chosen in the color blend at 60% under the tint, never the fade', () => {
    expect(CSS).toContain(`${GRAY} {\n  filter: grayscale(1);`)
    expect(CSS).toMatch(/\[data-photo-color="tint"\] \[data-hero-photo\] \{ isolation: isolate; \}/)
    expect(CSS).toMatch(/\[data-photo-color="tint"\] \[data-hero-photo\]::after \{[^}]*background-color: var\(--color-accent-on-light\);[^}]*mix-blend-mode: color;[^}]*opacity: 0\.6;/)
    expect(CSS).not.toMatch(/data-photo-edge[^{]*data-hero-photo/)
    // The name the tint reads is the accent as chosen, which no band re-points (a dark band's `--color-accent` is lighter).
    expect(CSS).not.toMatch(/--color-accent-on-light\s*:\s*var\(/)
  })

  it('the homepage hands the hero the site’s photo color, and the hero marks its photograph only where one is set', () => {
    const treated = (photoColor?: string) => {
      const {container, unmount} = render(<HomepageHero data={{heading: 'Counsel you can call'} as never} {...(photoColor ? {photoColor} : {})} />)
      const value = container.querySelector('[data-testid="skeleton"]')!.getAttribute('data-treated')
      unmount()
      return value
    }
    expect(treated('tint')).toBe('true')
    expect(treated('mono')).toBe('true')
    expect(treated()).toBe('false')
  })
})

// ─── The scrim's pairs over a tinted photograph ───────────────────────────────────────────────────────────────────────
// `validateWcag` holds every photo-band pair at the scrim over pure white (the photo floor), a bound: the scrim over any
// other pixel is no lighter. The tint is grayscale, then the accent in the `color` blend (W3C Compositing: the accent's
// hue and saturation at the photograph's luminosity, clipped into sRGB) at 60%, composited in gamma-encoded sRGB at eight
// bits a channel as the browser does (and as the engine's `blendOver` rounds the floor); every channel stays in [0, 1], so a
// tinted pixel is never lighter than white. Swept, not assumed: every preset and 500 seeded palettes, 52 gray levels and 52
// seeded colors, each pair on the scrim at its floor of 80%.

const ch = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const wcagLum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [wcagLum(a), wcagLum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const blendLum = (c: number[]) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
function clipColor(c: number[]): number[] {
  const l = blendLum(c), n = Math.min(...c), x = Math.max(...c)
  let o = c
  if (n < 0) o = o.map((v) => l + ((v - l) * l) / (l - n))
  if (x > 1) o = o.map((v) => l + ((v - l) * (1 - l)) / (x - l))
  return o
}
const setLum = (c: number[], l: number) => clipColor(c.map((v) => v + (l - blendLum(c))))
const gray = (c: number[]) => {
  const g = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  return [g, g, g]
}
const tinted = (pixel: number[], accent: number[]) => {
  const g = gray(pixel)
  const blended = setLum(accent, blendLum(g))
  return bits(g.map((v, i) => v * 0.4 + blended[i] * 0.6))
}
const bits = (c: number[]) => c.map((v) => Math.round(v * 255) / 255)
const over = (ground: number[], ink: number[], alpha: number) => bits(ground.map((v, i) => v * (1 - alpha) + ink[i] * alpha))

function seeded(n: number, seed: number): ColorInputs[] {
  let s = seed >>> 0
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const hex = () => '#' + Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0')
  return Array.from({length: n}, () => ({darkGround: hex(), lightGround: hex(), accent: hex(), action: rnd() < 0.5 ? hex() : null}))
}

describe('backlog 438: the backdrop hero’s text holds over its tinted photograph', () => {
  it('every photo-band pair, on every preset and 500 seeded palettes, over every tinted pixel under the scrim', () => {
    let s = 438
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
    const pixels = [...Array.from({length: 52}, (_, i) => [i / 51, i / 51, i / 51]), ...Array.from({length: 52}, () => bits([rnd(), rnd(), rnd()]))]
    const palettes = [...PALETTE_PRESETS.map((p) => p as unknown as ColorInputs), ...seeded(500, 438)]
    const failures: string[] = []
    for (const inputs of palettes) {
      const t = resolvePalette(inputs).tokens as Record<string, string>
      const accent = ch(t['--color-accent-on-light'])
      const scrim = ch(t['--color-scrim'])
      const floor = over([1, 1, 1], scrim, 0.8)
      for (const pixel of pixels) {
        const drawn = over(tinted(pixel, accent), scrim, 0.8)
        if (wcagLum(drawn) > wcagLum(floor) + 1e-12) failures.push(`${JSON.stringify(inputs)} pixel ${pixel}: lighter than the photo floor`)
        for (const [fg, min] of photoBandPairs(t)) {
          const r = ratio(ch(fg), drawn)
          if (r < min) failures.push(`${JSON.stringify(inputs)} pixel ${pixel}: ${fg} at ${r.toFixed(2)} < ${min}`)
        }
      }
    }
    expect(failures.length, failures.slice(0, 10).join('\n')).toBe(0)
  })
})
