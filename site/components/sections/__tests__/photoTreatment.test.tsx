import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>),
}))
vi.mock('@/components/ui/SanityImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  SanityImage: ({alt, className}: {alt: string; className?: string}) => <img alt={alt} className={className} />,
}))

import {PracticeAreaNavBlock} from '../PracticeAreaNavBlock'
import {AttorneySectionBlock} from '../AttorneySectionBlock'
import {ContentSectionBlock} from '../ContentSectionBlock'
import {VideoEmbed} from '@/components/media/VideoEmbed'
import {photoBandPairs, resolvePalette, type ColorInputs} from '@/lib/designTokens'
import {PALETTE_PRESETS} from '@/lib/palettes'

// PHOTO COLOR AND EDGE (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 16, `[R-641]`): one treatment for the site's
// photographs, set once. The rules reach feature photos and practice-card photos, never an icon, an attorney's photo or a
// cut-out; the tint sits under any text, on a practice card in place of the decorative gradient below its text block.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const GRAY = ':is([data-photo-color="mono"], [data-photo-color="tint"]) :is([data-feature-photo] img, nav [data-card] img:not([data-tile-icon] img))'
const photo = {asset: {_ref: 'image-p-1200x800-jpg'}}
const icon = {asset: {_ref: 'image-i-64x64-png'}}

describe('photo color', () => {
  it('turns practice-card and feature photos gray, and never an icon, an attorney or a cut-out', () => {
    expect(CSS).toContain(`${GRAY} {\n  filter: grayscale(1);`)
    const {container} = render(
      <div data-photo-color="mono"><main>
        <PracticeAreaNavBlock data={{heading: 'Areas', layout: 'feature', mobileDisplay: 'stacked', items: [{_key: 'a', label: 'Wills', href: '/wills/', image: photo, icon}]} as never} />
        <AttorneySectionBlock data={{heading: 'People', cardStyle: 'portrait', attorneys: [{_id: 'x', title: 'A. Lawyer', slug: 'attorneys/a', photo}]} as never} />
        <ContentSectionBlock data={{_type: 'contentSection', _id: 'c', layout: 'split', heading: 'Why', body: [], media: {kind: 'image', image: {...photo, alt: 'Office'}}} as never} disclaimer="Past results do not guarantee future outcomes." scale="marketing" />
        <ContentSectionBlock data={{_type: 'contentSection', _id: 'd', layout: 'split', heading: 'Who', body: [], media: {kind: 'cutout', image: {...photo, alt: 'Figure'}}} as never} disclaimer="Past results do not guarantee future outcomes." scale="marketing" />
      </main></div>,
    )
    const gray = [...container.querySelectorAll('img')].filter((img) => img.matches(GRAY)).map((img) => img.getAttribute('alt'))
    expect(gray).toContain('Office')
    expect(gray).not.toContain('Figure')
    expect(gray).not.toContain('A. Lawyer')
    // The practice card's photo is gray; its icon is not.
    const card = container.querySelector('nav [data-card]')!
    expect([...card.querySelectorAll('img')].map((img) => [img.closest('[data-tile-icon]') ? 'icon' : 'photo', img.matches(GRAY)])).toEqual([['photo', true], ['icon', false]])
  })

  it('the tint washes in the accent under the text, and the fade masks the edge facing the text', () => {
    expect(CSS).toMatch(/\[data-photo-color="tint"\] \[data-feature-photo\]::after \{[^}]*mix-blend-mode: color;/)
    expect(CSS).toMatch(/\[data-photo-color="tint"\] nav \[data-card\] img\.tile-photo \+ div \{[^}]*background-image: none;[^}]*mix-blend-mode: color;/)
    expect(CSS).toMatch(/\[data-photo-edge="fade"\] \.xl\\:order-first > \[data-feature-photo\] img \{ mask-image: linear-gradient\(to right/)
  })
})

// ONE TINT ON EVERY BAND (monorepo backlog 438): every photo tint, a feature photo's, a video poster's, a practice card's
// and the hero's, is the accent as chosen (`--color-accent-on-light`). A dark band, and a glowing card on one, re-points
// `--color-accent` to the lightened accent, a text form, which washed a photograph there paler than the same photograph
// on a light band. No text sits on a feature photo or a poster, and the one mark on a poster holds over every tinted
// pixel; a practice card's words sit on their own scrim above the tint, which holds over every tinted pixel too.

const ch = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const bits = (c: number[]) => c.map((v) => Math.round(v * 255) / 255)
const over = (ground: number[], ink: number[], alpha: number) => bits(ground.map((v, i) => v * (1 - alpha) + ink[i] * alpha))
const blendLum = (c: number[]) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
function clipColor(c: number[]): number[] {
  const l = blendLum(c), n = Math.min(...c), x = Math.max(...c)
  let o = c
  if (n < 0) o = o.map((v) => l + ((v - l) * l) / (l - n))
  if (x > 1) o = o.map((v) => l + ((v - l) * (1 - l)) / (x - l))
  return o
}
/** Grayscale, then the accent in the `color` blend (W3C Compositing) at 60%, at eight bits a channel. */
const tinted = (pixel: number[], accent: number[]) => {
  const g = 0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]
  const blended = clipColor(accent.map((v) => v + (blendLum([g, g, g]) - blendLum(accent))))
  return bits([g, g, g].map((v, i) => v * 0.4 + blended[i] * 0.6))
}
function seeded(n: number, seed: number): ColorInputs[] {
  let s = seed >>> 0
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const hex = () => '#' + Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0')
  return Array.from({length: n}, () => ({darkGround: hex(), lightGround: hex(), accent: hex(), action: rnd() < 0.5 ? hex() : null}))
}
const PALETTES = [...PALETTE_PRESETS.map((p) => p as unknown as ColorInputs), ...seeded(500, 4381)]

describe('backlog 438: one photo tint on every band', () => {
  it('every photo tint, the practice cards’ included, is the accent as chosen, which no band re-points', () => {
    const TINTS = [
      '\\[data-feature-photo\\]::after', '\\[data-video-poster\\]::after', '\\[data-hero-photo\\]::after',
      'nav \\[data-card\\] img\\.tile-photo \\+ div',
      'nav \\[data-card\\] div:has\\(> img:not\\(\\.tile-photo\\)\\):not\\(\\[data-tile-icon\\]\\)::after',
    ]
    for (const rule of TINTS) {
      expect(CSS).toMatch(new RegExp(`\\[data-photo-color="tint"\\] ${rule} \\{[^}]*background-color: var\\(--color-accent-on-light\\);[^}]*mix-blend-mode: color;[^}]*opacity: 0\\.6;`))
    }
    // Nothing in the photo color rules reads the band's accent.
    const region = CSS.slice(CSS.indexOf('/* Photo color and edge'), CSS.indexOf('/* The fade:'))
    expect(region.length).toBeGreaterThan(1000)
    expect(region).not.toContain('var(--color-accent)')
    // Declared once, at the root, as a color: no dark, photo, glow or island block re-points it.
    expect(CSS.match(/--color-accent-on-light\s*:/g)).toHaveLength(1)
    expect(CSS).toMatch(/--color-accent-on-light:\s*#[0-9a-f]{6};/i)
    // The engine emits it as the accent itself on every palette (a dark band's --color-accent is not).
    for (const inputs of PALETTES) {
      const t = resolvePalette(inputs).tokens as Record<string, string>
      expect(t['--color-accent-on-light'], JSON.stringify(inputs)).toBe(t['--color-accent'])
    }
  })

  it('no text sits on a treated feature photo or a poster on a dark band; the poster carries only its mark, above the tint', () => {
    const {container} = render(
      <div data-photo-color="tint"><main><section className="bg-brand-dark" data-ring-context="dark">
        <ContentSectionBlock data={{_type: 'contentSection', _id: 'c', layout: 'split', heading: 'Why', body: [{_type: 'block', _key: 'b', style: 'normal', children: [{_type: 'span', _key: 's', text: 'Plain answers.', marks: []}], markDefs: []}], media: {kind: 'image', image: {...photo, alt: 'Office'}}} as never} disclaimer="Past results do not guarantee future outcomes." scale="marketing" />
        <VideoEmbed video={{_id: 'v', title: 'Meet the firm', youTubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', thumbnail: {...photo, alt: 'A first conversation'}} as never} />
      </section></main></div>,
    )
    const feature = container.querySelector('[data-feature-photo]')!
    expect(feature.textContent!.trim()).toBe('')
    expect(feature.querySelector('h1, h2, h3, h4, h5, h6, p, a, button, svg')).toBeNull()
    const poster = container.querySelector('[data-video-poster]')!
    expect(poster.textContent!.trim()).toBe('')
    const mark = poster.querySelector('svg')!
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    // The mark's layer is stacked above the photograph's tint (`::after`, z auto).
    expect(mark.closest('span.z-\\[1\\]')).not.toBeNull()
  })

  it('the poster’s play mark holds 3:1 over every tinted pixel, at rest and hovered, on the presets and 500 seeded palettes', () => {
    // The mark: the dark ground's triangle on a disc of the page ground at 90%, over the dark ground's veil (10% at rest,
    // 25% hovered or focused) over the tinted photograph (`VideoPoster.tsx`).
    let s = 4382
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
    const pixels = [...Array.from({length: 52}, (_, i) => [i / 51, i / 51, i / 51]), ...Array.from({length: 52}, () => bits([rnd(), rnd(), rnd()]))]
    const failures: string[] = []
    for (const inputs of PALETTES) {
      const t = resolvePalette(inputs).tokens as Record<string, string>
      const [accent, dark, ground] = [ch(t['--color-accent-on-light']), ch(t['--color-brand-dark']), ch(t['--color-background'])]
      for (const pixel of pixels) {
        for (const veil of [0.1, 0.25]) {
          const disc = over(over(tinted(pixel, accent), dark, veil), ground, 0.9)
          const r = ratio(dark, disc)
          if (r < 3) failures.push(`${JSON.stringify(inputs)} pixel ${pixel} veil ${veil}: ${r.toFixed(2)}`)
        }
      }
    }
    expect(failures.length, failures.slice(0, 10).join('\n')).toBe(0)
  })

  it('a practice card’s words on a glowing card on a dark band sit on their own scrim, above the tint', () => {
    const {container} = render(
      <div data-photo-color="tint" data-card-glow="on"><main><section className="bg-brand-dark" data-ring-context="dark">
        <PracticeAreaNavBlock data={{heading: 'Areas', layout: 'spotlight', mobileDisplay: 'stacked', items: [{_key: 'a', label: 'Wills', href: '/wills/', image: photo}]} as never} />
      </section></main></div>,
    )
    const card = container.querySelector('nav [data-card]')!
    const tint = card.querySelector('img.tile-photo + div')!
    const words = card.querySelector('.tile-text-scrim')!
    expect(tint.getAttribute('aria-hidden')).toBe('true')
    expect(tint.textContent).toBe('')
    expect(tint.compareDocumentPosition(words) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(words.textContent).toContain('Wills')
    // The words' layer is stacked above the tint's (`z-10` over `z-[1]`).
    expect(words.closest('.z-10')).not.toBeNull()
    expect(tint.className.split(' ')).toContain('z-[1]')
  })

  it('a practice card’s words hold over every tinted pixel under their scrim, on the presets and 500 seeded palettes', () => {
    // The words sit on `tile-text-scrim`: the scrim at 80% at least, over the tinted photograph. Every photo-band pair
    // (the on-dark tiers, the stars, the control border) is checked against that composite at eight bits.
    let s = 4383
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
    const pixels = [...Array.from({length: 52}, (_, i) => [i / 51, i / 51, i / 51]), ...Array.from({length: 52}, () => bits([rnd(), rnd(), rnd()]))]
    const failures: string[] = []
    for (const inputs of PALETTES) {
      const t = resolvePalette(inputs).tokens as Record<string, string>
      const [accent, scrim] = [ch(t['--color-accent-on-light']), ch(t['--color-scrim'])]
      for (const pixel of pixels) {
        const ground = over(tinted(pixel, accent), scrim, 0.8)
        for (const [fg, min] of photoBandPairs(t)) {
          const r = ratio(ch(fg), ground)
          if (r < min) failures.push(`${JSON.stringify(inputs)} pixel ${pixel}: ${fg} at ${r.toFixed(2)} < ${min}`)
        }
      }
    }
    expect(failures.length, failures.slice(0, 10).join('\n')).toBe(0)
  })
})
