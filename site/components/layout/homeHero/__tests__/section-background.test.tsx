import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

// Section Background = the full-bleed pattern/texture behind the WHOLE hero, with
// the shared scrim. Rendered by both skeletons as the band's z-0 backdrop. These
// tests assert: it renders when present, is suppressed when an Overlay already has
// its own focal backdrop, a dark band draws it under the scrim, and a light band
// draws it as the ghost (monorepo backlog 321).

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
    scrimStyle: 'flat',
    scrimColor: 'auto',
    scrimDirection: 'auto',
    sectionBg: null,
    hasSectionBg: false,
    sectionBgFit: 'cover',
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

const content: ResolvedHomeContent = {
  eyebrow: 'Eyebrow',
  heading: 'Heading',
  description: 'Desc',
  ctas: [],
  galleryImages: [],
  videoUrl: null,
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

  it('dark band → the scrim tone (the dark ground capped at L 0.20)', () => {
    const {container} = render(
      <Split config={config()} content={content} surface={surface({scheme: 'dark', isDark: true})} sectionBackground={sectionBg({scheme: 'dark', isDark: true})} />,
    )
    expect(container.querySelector('[data-testid="hero-scrim"]')?.className).toContain('bg-scrim')
  })

  it('a dark band reads its own colors, not the ghost\'s', () => {
    for (const hero of [
      <Split key="split" config={config()} content={content} surface={surface()} sectionBackground={sectionBg()} />,
      <Overlay key="overlay" config={config({skeleton: 'overlay', backdrop: 'none'})} content={content} surface={surface()} sectionBackground={sectionBg()} />,
    ]) {
      const {container} = render(hero)
      expect(container.querySelector('section')!.hasAttribute('data-fade')).toBe(false)
      expect(container.querySelector('[data-hero-ghost]')).toBeNull()
    }
  })
})

// THE GHOST ON A LIGHT BAND (monorepo backlog 321, Justin's ruling of 2026-10-14, "2: A"). A light band's text is dark, so
// the worst photo pixel is black, and a scrim that held every light tier over it had to be 97%: a photo in name only. The
// band draws the Background theme's ghost instead: the photo in grey over the page ground at the opacity the palette
// solved (`--fade-opacity-on-light`, `fadeOnLight`), no scrim, and the band reads the tiers solved over that floor
// (`data-fade="light"`), which `validateWcag` holds and colorGuarantee.test.ts sweeps through the rule as drawn.
const CSS = fs.readFileSync(path.resolve(__dirname, '../../../../app/globals.css'), 'utf8')
const light = {scheme: 'light' as const, isDark: false}

describe('homepage hero — a light band\'s Section Background is the ghost', () => {
  for (const [name, draw] of [
    ['Split', () => <Split config={config()} content={content} surface={surface(light)} sectionBackground={sectionBg(light)} />],
    ['Overlay', () => <Overlay config={config({skeleton: 'overlay', backdrop: 'none'})} content={content} surface={surface(light)} sectionBackground={sectionBg(light)} />],
  ] as const) {
    it(`${name}: the photo in grey at the ghost's opacity over the page ground, no scrim, the band on its ghost tiers`, () => {
      const {container} = render(draw())
      const band = container.querySelector('section')!
      expect(band.getAttribute('data-fade')).toBe('light')
      // Not the photo band's colors: those are white text's.
      expect(band.hasAttribute('data-hero-image')).toBe(false)
      expect(container.querySelector('[data-testid="hero-scrim"]')).toBeNull()
      const backdrop = container.querySelector('[data-testid="hero-backdrop"]') as HTMLElement
      expect(backdrop.className.split(' ')).toContain('bg-background')
      expect(backdrop.hasAttribute('data-hero-ghost')).toBe(true)
      const ghost = backdrop.querySelector('[data-photo-ghost]') as HTMLElement
      expect(ghost.style.opacity).toBe('var(--fade-opacity-on-light, 0)')
      expect(ghost.className.split(' ')).toContain('grayscale')
      expect(ghost.querySelector('[data-testid="hero-bg-tile"]')).not.toBeNull()
    })
  }

  it('the ghost is decoration: forced colors, more contrast and print remove it', () => {
    for (const media of ['forced-colors: active', 'prefers-contrast: more']) expect(CSS).toContain(`@media (${media}) { [data-photo-ghost] { display: none; } }`)
    expect(CSS).toContain('@media print { [data-photo-ghost] { display: none; } }')
  })

  it('a transparent header over the ghost takes the band\'s ghost tiers, as one over a photo takes the photo floor\'s', () => {
    // Not a dark transparent header: it takes its own solid ground over a light band (monorepo backlog 458).
    const SEL = ':root:has([data-hero-ghost]) header.bg-transparent:not([data-transparent="dark"])'
    expect(CSS).toContain(`[data-fade="light"],\n${SEL} {\n  /* A heading in the button color`)
    const {container} = render(
      <>
        <header className="fixed bg-transparent" data-transparent="light" />
        <Split config={config()} content={content} surface={surface(light)} sectionBackground={sectionBg(light)} />
      </>,
      {container: document.documentElement.appendChild(document.createElement('div'))},
    )
    expect(container.querySelector('header')!.matches(SEL)).toBe(true)
    container.querySelector('header')!.setAttribute('data-transparent', 'dark')
    expect(container.querySelector('header')!.matches(SEL)).toBe(false)
    container.remove()
    const solid = document.body.appendChild(document.createElement('header'))
    solid.className = 'bg-transparent'
    expect(solid.matches(SEL)).toBe(false)
    solid.remove()
  })
})
