import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// The full-viewport height cap and the content strip (item 58, ruled
// 2026-07-23): with a strip present the hero has NO height ceiling — a strip
// below the fold is fine, a cut-off strip is not. With the strip off, the
// capped behavior is unchanged. The strip-active predicate is shared between
// the strip component and the band's cap decision so they cannot disagree.

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
import {heroStripActive} from '../HeroSiloStrip'
import type {HeroConfig, ResolvedHomeContent, PracticeAreaItem} from '../types'
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
    contentStrip: false,
    siloLayout: 'cards',
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

const ITEMS: PracticeAreaItem[] = [
  {_key: 'a', label: 'Family Law', href: '/family-law/', description: null, icon: null, image: null, featured: false},
]

function content(items: PracticeAreaItem[] = []): ResolvedHomeContent {
  return {
    eyebrow: 'Eyebrow',
    heading: 'Heading',
    description: 'Desc',
    ctas: [],
    galleryImages: [],
    videoUrl: null,
    practiceAreaItems: items,
  }
}

const band = (container: HTMLElement) => container.querySelector('section') as HTMLElement

describe('hero height cap vs the content strip', () => {
  it('full-viewport WITHOUT a strip keeps the 60rem cap (unchanged behavior)', () => {
    const {container} = render(
      <Overlay config={config()} content={content()} surface={surface()} sectionBackground={null} />,
    )
    expect(band(container).className).toContain('min-h-svh')
    expect(band(container).className).toContain('max-h-[60rem]')
  })

  it('full-viewport WITH an active strip drops the cap and keeps the floor', () => {
    const {container} = render(
      <Overlay
        config={config({contentStrip: true, siloLayout: 'cards'})}
        content={content(ITEMS)}
        surface={surface()}
        sectionBackground={null}
      />,
    )
    expect(band(container).className).toContain('min-h-svh')
    expect(band(container).className).not.toContain('max-h-[60rem]')
  })

  it('strip toggled on with ZERO items renders no strip and keeps the cap', () => {
    // heroStripActive is the single predicate: no items → the strip returns
    // null, so the cap must stay — an uncapped hero with nothing to contain
    // would just stretch.
    const {container} = render(
      <Overlay
        config={config({contentStrip: true})}
        content={content([])}
        surface={surface()}
        sectionBackground={null}
      />,
    )
    expect(band(container).className).toContain('max-h-[60rem]')
    expect(container.querySelector('[aria-label="Practice areas"]')).toBeNull()
  })

  it('content height mode is untouched either way', () => {
    const {container} = render(
      <Overlay
        config={config({heightMode: 'content', contentStrip: true})}
        content={content(ITEMS)}
        surface={surface()}
        sectionBackground={null}
      />,
    )
    expect(band(container).className).not.toContain('min-h-svh')
    expect(band(container).className).not.toContain('max-h-[60rem]')
  })

  it('heroStripActive: the predicate both consumers share', () => {
    expect(heroStripActive(config({contentStrip: true}), ITEMS)).toBe(true)
    expect(heroStripActive(config({contentStrip: false}), ITEMS)).toBe(false)
    expect(heroStripActive(config({contentStrip: true}), [])).toBe(false)
  })
})
