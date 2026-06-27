import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// Section Background = the full-bleed pattern/texture behind the WHOLE hero, with
// the shared scrim. Rendered by both skeletons as the band's z-0 backdrop. These
// tests assert: it renders when present, is suppressed when an Overlay already has
// its own focal backdrop, and its scrim tone follows the band scheme.

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt, fill, className, style}) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} data-fill={fill ? 'true' : 'false'} className={className} style={style} />
  )),
}))

vi.mock('@/components/ui/ButtonGroup', () => ({
  ButtonGroup: vi.fn(() => <div data-testid="button-group" />),
  toCtaItems: vi.fn((b) => b),
}))

import {Split} from '../skeletons/Split'
import {Overlay} from '../skeletons/Overlay'
import type {HeroConfig, ResolvedHomeContent} from '../types'
import type {ResolvedHeroSurface, HeroImage} from '@/lib/heroSurface'

const IMG: NonNullable<HeroImage> = {src: 'https://cdn.sanity.io/images/x/y/pattern-1200x800.jpg', alt: 'pattern', fit: 'tile'}

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
    ...over,
  }
}

function sectionBg(over: Partial<ResolvedHeroSurface> = {}): ResolvedHeroSurface {
  return surface({bgImage: IMG, hasImage: true, fit: 'tile', ...over})
}

function config(over: Partial<HeroConfig> = {}): HeroConfig {
  return {
    skeleton: 'split',
    heightMode: 'content',
    contentAlign: 'left',
    backdrop: 'none',
    foreground: false,
    contentStrip: false,
    siloLayout: 'cards',
    scrimStyle: 'flat',
    splitMedia: 'image',
    splitImageStyle: 'contained',
    splitImageRatio: 'landscape',
    textTreatment: 'inline',
    mediaSide: 'right',
    motion: 'none',
    ...over,
  }
}

const content: ResolvedHomeContent = {
  eyebrow: 'Eyebrow',
  heading: 'Heading',
  description: 'Desc',
  ctas: [],
  galleryImages: [],
  videoUrl: null,
  practiceAreaItems: [],
}

describe('homepage hero — Section Background', () => {
  it('Split renders the section backdrop + scrim when a Section Background is present', () => {
    const {getByTestId} = render(
      <Split config={config({skeleton: 'split'})} content={content} surface={surface()} sectionBackground={sectionBg()} />,
    )
    expect(getByTestId('hero-backdrop')).toBeTruthy()
    expect(getByTestId('hero-scrim')).toBeTruthy()
  })

  it('Split renders NO section backdrop when none is set', () => {
    const {queryByTestId} = render(
      <Split config={config({skeleton: 'split'})} content={content} surface={surface()} sectionBackground={null} />,
    )
    expect(queryByTestId('hero-backdrop')).toBeNull()
  })

  it('Overlay (backdrop = none) renders the section backdrop when present', () => {
    const {getByTestId} = render(
      <Overlay config={config({skeleton: 'overlay', backdrop: 'none'})} content={content} surface={surface()} sectionBackground={sectionBg()} />,
    )
    expect(getByTestId('hero-backdrop')).toBeTruthy()
  })

  it('Overlay with its own image backdrop suppresses the Section Background (no double backdrop)', () => {
    const {queryByTestId} = render(
      <Overlay
        config={config({skeleton: 'overlay', backdrop: 'image'})}
        content={content}
        surface={surface({bgImage: IMG, hasImage: true})}
        sectionBackground={sectionBg()}
      />,
    )
    // Overlay's own focal backdrop is a bespoke div (no hero-backdrop testid); the
    // section background must NOT also render, so there is zero hero-backdrop.
    expect(queryByTestId('hero-backdrop')).toBeNull()
  })

  it('dark band → brand-dark scrim tone', () => {
    const {container} = render(
      <Split config={config()} content={content} surface={surface({scheme: 'dark', isDark: true})} sectionBackground={sectionBg({scheme: 'dark', isDark: true})} />,
    )
    expect(container.querySelector('[data-testid="hero-scrim"]')?.className).toContain('bg-brand-dark')
  })

  it('light band → page-background scrim tone', () => {
    const {container} = render(
      <Split config={config()} content={content} surface={surface({scheme: 'light', isDark: false})} sectionBackground={sectionBg({scheme: 'light', isDark: false})} />,
    )
    expect(container.querySelector('[data-testid="hero-scrim"]')?.className).toContain('bg-background')
  })
})
