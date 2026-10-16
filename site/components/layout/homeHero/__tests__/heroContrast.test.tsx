import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'

// THREE HOMEPAGE HERO DEFECTS UNDER WCAG 2.2 AA (monorepo backlog 459, 460 and 461, found by ADV-A11Y-C).
//   460  An Overlay hero whose Backdrop is Image or Mosaic but has no photograph drew the dark scrim over nothing, under the
//        light scheme's dark text. With nothing to draw it is a hero with no backdrop: its own ground, no scrim.
//   461  The Split hero's video play mark was a white triangle on a 30% dark disc, 1.7 to 2.0:1 over a light poster. It is
//        the video poster's mark, whose 3:1 over every pixel `photoTreatment.test.tsx` sweeps.
//   459  The Split hero's full-bleed photograph ran up behind a merged header, so its links and buttons sat on the raw
//        photograph. From lg the photograph starts under the header, which sits on the band's own ground; the header's
//        height is 0 when it is not merged, so nothing moves on a site without the merge.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img src={src} alt={alt ?? ''} className={className} />,
}))
vi.mock('@/components/ui/SanityImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  SanityImage: ({alt}: {alt: string}) => <img alt={alt} />,
}))
vi.mock('@/components/ui/ButtonGroup', () => ({
  ButtonGroup: () => <div data-testid="button-group"><button type="button">Call us</button></div>,
  toCtaItems: (b: unknown) => b,
}))
vi.mock('@/components/ui/DialogPanel', () => ({DialogPanel: ({trigger}: {trigger: React.ReactNode}) => <>{trigger}</>}))

import {Split} from '../skeletons/Split'
import {Overlay} from '../skeletons/Overlay'
import {resolveHeroConfig} from '../config'
import type {HeroConfig, ResolvedHomeContent} from '../types'
import type {ResolvedHeroSurface} from '@/lib/heroSurface'
import {VideoEmbed} from '@/components/media/VideoEmbed'

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../../app/globals.css'), 'utf8')

const photo = {src: 'https://cdn.example.com/storefront.jpg', alt: 'A storefront', width: 1600, height: 1000}
const gallery = ['one', 'two'].map((n) => ({src: `https://cdn.example.com/${n}.jpg`, alt: `Gallery ${n}`}))

function surface(over: Partial<ResolvedHeroSurface> = {}): ResolvedHeroSurface {
  return {
    scheme: 'dark', isDark: true, bgImage: photo as never, hasImage: true, fit: 'cover', foreground: null, hasForeground: false,
    scrimOpacity: 80, scrimStyle: 'flat', scrimColor: 'auto', scrimDirection: 'auto', sectionBg: null, hasSectionBg: false, sectionBgFit: 'cover',
    ...over,
  }
}
const noPhoto = (scheme: 'dark' | 'light') => surface({scheme, isDark: scheme === 'dark', bgImage: null, hasImage: false, lightGround: 'tint'})
const content = (over: Partial<ResolvedHomeContent> = {}): ResolvedHomeContent =>
  ({eyebrow: 'Since 1998', heading: 'Counsel you can call', description: 'A plain answer.', ctas: [{title: 'Call us'}] as never, galleryImages: [], videoUrl: null, ...over})
const config = (over: Partial<HeroConfig>): HeroConfig => ({...resolveHeroConfig({heading: 'Counsel you can call'} as never), ...over})
const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

describe('backlog 460: an Overlay hero with a backdrop but no photograph is a hero with no backdrop', () => {
  for (const backdrop of ['image', 'mosaic'] as const) {
    it(`${backdrop}, no photograph, light scheme: no scrim, no photo cascade, the band's light ground under its dark text`, () => {
      const {container} = render(<Overlay config={config({skeleton: 'overlay', backdrop})} content={content()} surface={noPhoto('light')} />)
      const band = container.querySelector('section')!
      expect(container.querySelector('[data-testid="hero-scrim"]')).toBeNull()
      expect(band.hasAttribute('data-hero-image')).toBe(false)
      expect(band.hasAttribute('data-ring-context')).toBe(false)
      expect(classes(band)).toContain('bg-hero-tint')
      expect(container.querySelector('ul[aria-label="Background image mosaic"]')).toBeNull()
    })

    it(`${backdrop}, no photograph, dark scheme: the dark ground itself, no scrim over nothing`, () => {
      const {container} = render(<Overlay config={config({skeleton: 'overlay', backdrop})} content={content()} surface={noPhoto('dark')} />)
      const band = container.querySelector('section')!
      expect(container.querySelector('[data-testid="hero-scrim"]')).toBeNull()
      expect(band.hasAttribute('data-hero-image')).toBe(false)
      expect(band.getAttribute('data-ring-context')).toBe('dark')
      expect(classes(band)).toContain('bg-brand-dark')
    })
  }

  it('with a photograph, or a mosaic with tiles, the backdrop and its scrim are as before', () => {
    const image = render(<Overlay config={config({skeleton: 'overlay', backdrop: 'image'})} content={content()} surface={surface()} />).container
    expect(image.querySelector('[data-testid="hero-scrim"]')).not.toBeNull()
    expect(image.querySelector('section')!.getAttribute('data-hero-image')).toBe('true')
    expect(image.querySelector('img[alt="A storefront"]')).not.toBeNull()
    const mosaic = render(<Overlay config={config({skeleton: 'overlay', backdrop: 'mosaic'})} content={content({galleryImages: gallery as never})} surface={noPhoto('dark')} />).container
    expect(mosaic.querySelector('[data-testid="hero-scrim"]')).not.toBeNull()
    expect(mosaic.querySelectorAll('ul[aria-label="Background image mosaic"] img')).toHaveLength(2)
    // A mosaic with no gallery draws the one photograph it has, as before.
    const single = render(<Overlay config={config({skeleton: 'overlay', backdrop: 'mosaic'})} content={content()} surface={surface()} />).container
    expect(single.querySelectorAll('ul[aria-label="Background image mosaic"] img')).toHaveLength(1)
  })

  it('with no photograph, a Section Background is drawn as on a hero with no backdrop', () => {
    const section = {...surface({scheme: 'light', isDark: false}), bgImage: {...photo, alt: ''} as never}
    const {container} = render(<Overlay config={config({skeleton: 'overlay', backdrop: 'image'})} content={content()} surface={noPhoto('light')} sectionBackground={section} />)
    expect(container.querySelector('section')!.getAttribute('data-fade')).toBe('light')
    expect(container.querySelector('[data-testid="hero-scrim"]')).toBeNull()
  })
})

describe('backlog 461: the Split hero’s play mark is the video poster’s', () => {
  const video = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
  const splitMark = () => {
    const {container} = render(<Split config={config({skeleton: 'split', splitMedia: 'video'})} content={content({videoUrl: video})} surface={surface({scheme: 'light', isDark: false})} />)
    return [...container.querySelectorAll('button')].find((b) => b.querySelector('svg'))!
  }
  const posterMark = () => {
    const {container} = render(<VideoEmbed video={{_id: 'v', title: 'Meet the firm', youTubeUrl: video, thumbnail: {asset: {_ref: 'image-t-1600x900-jpg'}}} as never} />)
    return container.querySelector('a')!
  }

  it('the same veil, disc and triangle the poster draws, whose 3:1 over every pixel photoTreatment.test.tsx sweeps', () => {
    const mark = (el: Element) => el.querySelector('svg')!.parentElement!.parentElement!.outerHTML
    expect(mark(splitMark())).toBe(mark(posterMark()))
    const disc = splitMark().querySelector('svg')!.parentElement!
    expect(classes(disc)).toEqual(expect.arrayContaining(['bg-background/90', 'rounded-full']))
    expect(classes(splitMark().querySelector('svg')!)).toContain('text-brand-dark')
    // The white triangle on a 30% dark disc is gone.
    expect(splitMark().outerHTML).not.toContain('bg-brand-dark/30')
    expect(splitMark().outerHTML).not.toContain('text-brand-white')
  })

  it('draws its focus on the mark’s layer, above the poster, as the poster does', () => {
    const button = splitMark()
    expect(button.getAttribute('aria-label')).toBe('Play video')
    expect(classes(button)).toEqual(expect.arrayContaining(['group', 'focus-visible:outline-none']))
    const layer = button.querySelector('svg')!.parentElement!.parentElement!
    expect(classes(layer)).toEqual(expect.arrayContaining(['group-focus-visible:ring-2', 'group-focus-visible:ring-focus', 'group-focus-visible:outline-transparent']))
  })
})

describe('backlog 459: the Split hero’s full-bleed photograph starts under a merged header', () => {
  const full = (mediaSide: 'left' | 'right') =>
    render(<Split config={config({skeleton: 'split', splitImageStyle: 'full', mediaSide})} content={content()} surface={surface({scheme: 'light', isDark: false})} />).container

  it.each(['left', 'right'] as const)('media on the %s: the photograph’s half carries the clearance, the text half keeps its own', (side) => {
    const container = full(side)
    const half = container.querySelector('img[alt="A storefront"]')!.parentElement!
    expect(classes(half)).toContain('hero-photo-under-header')
    expect(container.querySelectorAll('.hero-photo-under-header')).toHaveLength(1)
    // The band is flush, so the band's ground is what the header sits on above the photograph.
    expect(classes(container.querySelector('section')!)).toContain('bg-hero-tint')
  })

  it('the clearance is the merged header’s height, from lg only (a phone stacks the photograph under the text)', () => {
    const found: {at: string; decls: Record<string, string>}[] = []
    postcss.parse(CSS).walkAtRules('utility', (at) => {
      if (at.params !== 'hero-photo-under-header') return
      // Nothing outside the lg variant: a phone stacks the photograph under the text.
      at.each((node) => expect(node.type === 'atrule' || node.type === 'comment', `${node}`).toBe(true))
      at.walkAtRules((variant) => {
        const decls: Record<string, string> = {}
        variant.walkDecls((d) => { decls[d.prop] = d.value })
        found.push({at: `@${variant.name} ${variant.params}`, decls})
      })
    })
    expect(found).toHaveLength(1)
    expect(found[0].at).toBe('@variant lg')
    // The same SSR fallback the band's own clearance takes (`HERO_HEADER_CLEARANCE`); 0px on a site without the merge.
    expect(found[0].decls).toEqual({'margin-top': 'var(--header-height, 8rem)'})
  })
})
