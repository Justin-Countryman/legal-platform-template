import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// ─── The hero carries Gradient bloom's glow (the roster eye of 2026-10-03, `[R-631]`) ────────────────────────────────
// Justin: "there is no gradient in the hero to create that continuity after a few sections the gradient stuff just
// stops". The walk gives a dark hero its place in the first lit run (`walkPage().hero`), and the band draws it as a
// section draws its own: the glow, its place and length, its peak and the side its light comes from, and the photo
// band's colors (`data-glow`). Only where the hero paints the dark ground: a light hero, or one behind a photograph,
// a mosaic or a section background, draws none.

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt}) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} />
  )),
}))
vi.mock('@/components/ui/ButtonGroup', () => ({
  ButtonGroup: vi.fn(() => <div data-testid="button-group" />),
  toCtaItems: vi.fn((b) => b),
}))

import {Overlay} from '../skeletons/Overlay'
import {Split} from '../skeletons/Split'
import {resolveHeroConfig} from '../config'
import type {HeroConfig, ResolvedHomeContent} from '../types'
import type {ResolvedHeroSurface} from '@/lib/heroSurface'

function surface(over: Partial<ResolvedHeroSurface> = {}): ResolvedHeroSurface {
  return {
    scheme: 'dark', isDark: true, bgImage: null, hasImage: false, fit: 'cover', foreground: null, hasForeground: false,
    scrimOpacity: 80, scrimStyle: 'flat', scrimColor: 'auto', scrimDirection: 'auto', sectionBg: null, hasSectionBg: false, sectionBgFit: 'cover',
    ...over,
  }
}
const content: ResolvedHomeContent = {heading: 'Counsel you can call', ctas: [], galleryImages: []}
const config = (over: Partial<HeroConfig> = {}): HeroConfig => ({...resolveHeroConfig({heading: content.heading, skeleton: 'overlay', backdrop: 'none'} as never), ...over})
const GLOW = {index: 0, length: 3, peak: 1, side: 'right' as const}
const classes = (el: Element | null) => (el?.className ?? '').split(/\s+/)

describe('the hero band under Gradient bloom', () => {
  it('draws the glow on a dark overlay hero, in the run the walk gave it', () => {
    const {container} = render(<Overlay config={config()} content={content} surface={surface()} glow={GLOW} />)
    const band = container.querySelector('section')!
    expect(classes(band)).toEqual(expect.arrayContaining(['bg-brand-dark', 'band-glow', 'grad-i-0', 'grad-n-3', 'grad-p-1']))
    expect(classes(band)).not.toContain('glow-from-left')
    expect(band.getAttribute('data-glow')).toBe('true')
    expect(band.getAttribute('data-ring-context')).toBe('dark')
  })

  it('lit from the left where the walk says so, and at the hero’s own peak behind its figure', () => {
    const {container} = render(<Overlay config={config()} content={content} surface={surface()} glow={{index: 0, length: 2, peak: 0, side: 'left'}} />)
    expect(classes(container.querySelector('section'))).toEqual(expect.arrayContaining(['band-glow', 'grad-i-0', 'grad-n-2', 'grad-p-0', 'glow-from-left']))
  })

  it('draws none without a run, on a light hero, or where a backdrop paints the band', () => {
    expect(classes(render(<Overlay config={config()} content={content} surface={surface()} />).container.querySelector('section'))).not.toContain('band-glow')
    const light = render(<Overlay config={config()} content={content} surface={surface({scheme: 'light', isDark: false})} glow={GLOW} />).container.querySelector('section')!
    expect(classes(light)).not.toContain('band-glow')
    expect(light.getAttribute('data-glow')).toBeNull()
    const img = {src: 'https://cdn.example.com/p.jpg', alt: 'A place'}
    const photo = render(<Overlay config={config({backdrop: 'image'})} content={content} surface={surface({bgImage: img, hasImage: true})} glow={GLOW} />).container.querySelector('section')!
    expect(classes(photo)).not.toContain('band-glow')
    expect(photo.getAttribute('data-glow')).toBeNull()
  })

  it('a dark split hero on its own ground draws it too', () => {
    const {container} = render(<Split config={config({skeleton: 'split', splitMedia: 'image'})} content={content} surface={surface()} glow={GLOW} />)
    expect(classes(container.querySelector('section'))).toEqual(expect.arrayContaining(['band-glow', 'grad-i-0', 'grad-n-3', 'grad-p-1']))
  })
})
