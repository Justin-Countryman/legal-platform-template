import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// The full-viewport height cap, and the coupling that used to condition it.
//
// Item 58 (ruled 2026-07-23) gave the cap an escape hatch: with the hero's
// practice-area content strip present the band dropped its 60rem ceiling, so a
// strip that ran past the fold was scrolled to rather than cut. The predicate
// `heroStripActive` was shared between the strip and the band so the cap
// decision and the render decision could not disagree.
//
// Item 163 (ruled 2026-08-09 by Justin) removed the strip entirely — it rendered
// the same tile layout the `siloNavBlock` canvas block renders, so the homepage
// carried two look-alike practice-area surfaces under two unrelated controls.
// With the strip gone the only content that could outgrow the ceiling is gone
// with it, so the cap is unconditional and `uncapped` no longer exists. What
// this file pins is that end state: the cap applies whenever the hero is
// full-viewport, content height is untouched, and NO practice-area tiles render
// inside the hero band on any skeleton.
//
// The last assertion is the one that earns its keep. A reintroduced strip would
// be invisible to `tsc` and to every other check — the look-alike pair was found
// by an operator looking at a rendered page — so it is pinned here structurally
// rather than left to a reader.

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
import type {HeroConfig, ResolvedHomeContent} from '../types'
import type {ResolvedHeroSurface} from '@/lib/heroSurface'

function surface(over: Partial<ResolvedHeroSurface> = {}): ResolvedHeroSurface {
  return {
    scheme: 'dark',
    isDark: true,
    bgImage: null,
    hasImage: false,
    fit: 'cover',
    foreground: null,
    hasForeground: false,
    scrimOpacity: 80,
    scrimStyle: 'flat',
    scrimColor: 'auto',
    scrimDirection: 'auto',
    sectionBg: null,
    hasSectionBg: false,
    sectionBgFit: 'cover',
    ...over,
  }
}

function config(over: Partial<HeroConfig> = {}): HeroConfig {
  return {
    skeleton: 'overlay',
    heightMode: 'fullViewport',
    contentAlign: 'left',
    backdrop: 'none',
    foreground: false,
    scrimStyle: 'flat',
    scrimColor: 'auto',
    scrimDirection: 'auto',
    splitMedia: 'image',
    splitImageStyle: 'contained',
    splitImageRatio: 'landscape',
    textTreatment: 'inline',
    mediaSide: 'right',
    motion: 'none',
    ...over,
  }
}

function content(): ResolvedHomeContent {
  return {
    eyebrow: 'Eyebrow',
    heading: 'Heading',
    description: 'Desc',
    ctas: [],
    galleryImages: [],
    videoUrl: null,
  }
}

const band = (container: HTMLElement) => container.querySelector('section') as HTMLElement

describe('the full-viewport height cap', () => {
  it('applies on a full-viewport Overlay', () => {
    const {container} = render(
      <Overlay config={config()} content={content()} surface={surface()} sectionBackground={null} />,
    )
    expect(band(container).className).toContain('min-h-svh')
    expect(band(container).className).toContain('max-h-[60rem]')
  })

  it('applies on a full-viewport Split', () => {
    const {container} = render(
      <Split
        config={config({skeleton: 'split'})}
        content={content()}
        surface={surface()}
        sectionBackground={null}
      />,
    )
    expect(band(container).className).toContain('min-h-svh')
    expect(band(container).className).toContain('max-h-[60rem]')
  })

  it('content height mode carries neither the floor nor the ceiling', () => {
    const {container} = render(
      <Overlay
        config={config({heightMode: 'content'})}
        content={content()}
        surface={surface()}
        sectionBackground={null}
      />,
    )
    expect(band(container).className).not.toContain('min-h-svh')
    expect(band(container).className).not.toContain('max-h-[60rem]')
  })
})

describe('the hero renders no practice-area surface of its own (item 163)', () => {
  it('Overlay renders no practice-area list', () => {
    const {container} = render(
      <Overlay config={config()} content={content()} surface={surface()} sectionBackground={null} />,
    )
    expect(container.querySelector('[aria-label="Practice areas"]')).toBeNull()
    expect(container.querySelectorAll('ul[role="list"]')).toHaveLength(0)
  })

  it('every Split composition renders no practice-area list', () => {
    // All three Split branches — the overlap card, the full-bleed image side and
    // the inline panel — each carried their own copy of the strip.
    for (const over of [
      {textTreatment: 'overlap' as const},
      {splitImageStyle: 'full' as const},
      {},
    ]) {
      const {container} = render(
        <Split
          config={config({skeleton: 'split', ...over})}
          content={content()}
          surface={surface({bgImage: {src: '/x.jpg', alt: ''}, hasImage: true})}
          sectionBackground={null}
        />,
      )
      expect(container.querySelector('[aria-label="Practice areas"]')).toBeNull()
    }
  })
})
