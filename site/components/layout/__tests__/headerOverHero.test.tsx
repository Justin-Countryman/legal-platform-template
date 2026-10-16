import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {act, render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'

// THE MERGED HEADER OVER THE HERO ON SCREEN (monorepo backlog 458 and 397; 363 is 397's earlier record). A merged header's
// transparent state takes its polarity from the site's inner-page hero (`resolveMergedHeaderScheme`), because the layout
// that draws the header cannot see the page. So an inner page that uploads its own photograph or sets its own scheme, and
// the homepage, whose hero is its own, could put the header's words on a ground of the other polarity: dark words over a
// photograph's dark scrim, white words over a light hero (ADV-17B4-A measured 1.02:1). Ruled by the lead, 2026-10-15
// (option a): where the hero on screen disagrees, the header takes its own solid ground, by the stylesheet alone, as the
// phone row and the profile pages already do; every pair on that ground is the solid header's, which validateWcag holds.
// Where they agree, nothing changes. Held here on the real shell, the real heroes and the real stylesheet.

vi.mock('next/navigation', () => ({usePathname: () => '/family-law/'}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: {src: string; alt?: string; className?: string}) => <img src={p.src} alt={p.alt ?? ''} className={p.className} />,
}))
vi.mock('@/components/ui/DialogPanel', () => ({DialogPanel: ({trigger}: {trigger: React.ReactNode}) => <>{trigger}</>}))

import {SiteShell, type SiteChrome} from '../SiteShell'
import {InternalHero} from '../InternalHero'
import {InternalPageHeader} from '../InternalPageHeader'
import {Header} from '../Header'
import {Overlay} from '../homeHero/skeletons/Overlay'
import {Split} from '../homeHero/skeletons/Split'
import {resolveHeroConfig} from '../homeHero/config'
import type {HeroConfig, ResolvedHomeContent} from '../homeHero/types'
import type {ResolvedHeroSurface} from '@/lib/heroSurface'
import type {HeaderData} from '../headers/shared'

class NoResize {
  observe() {}
  unobserve() {}
  disconnect() {}
}
beforeEach(() => { vi.stubGlobal('ResizeObserver', NoResize) })
afterEach(() => { vi.unstubAllGlobals(); Object.defineProperty(window, 'scrollY', {value: 0, writable: true, configurable: true}) })

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const LOGO = (src: string) => ({src, alt: 'Test Firm', width: 120, height: 40})
const PHOTO = {src: 'https://cdn.example.com/office.jpg', alt: 'The office', width: 1600, height: 900}

// The declarations the stylesheet's top-level rules give an element, in source order: what the browser would apply from
// globals.css's own rules (the utilities are Tailwind's, and the header's own `bg-transparent` loses to any of these).
const RULES = (() => {
  const out: {selector: string; decls: Record<string, string>}[] = []
  postcss.parse(CSS).each((node) => {
    if (node.type !== 'rule') return
    const decls: Record<string, string> = {}
    node.walkDecls((d) => { decls[d.prop] = d.value })
    for (const selector of node.selectors) out.push({selector, decls})
  })
  return out
})()
function applied(el: Element): Record<string, string> {
  const out: Record<string, string> = {}
  for (const {selector, decls} of RULES) {
    let hit = false
    try { hit = el.matches(selector) } catch { hit = false }
    if (hit) Object.assign(out, decls)
  }
  return out
}

function chrome(siteHero: Record<string, unknown>, defaultScheme: 'transparent-dark' | 'transparent-light' = 'transparent-dark'): SiteChrome {
  return {
    header: {
      siteSettings: {firmName: 'Test Firm'},
      designSettings: {logoOnLight: LOGO('/on-light.png'), logoOnDark: LOGO('/on-dark.png')},
      mainNavigation: {navItems: [{label: 'About', href: '/about/'}], heroMerge: true, defaultScheme, scrolledScheme: 'light', headerLayout: 'apex'},
    },
    footer: {siteSettings: {firmName: 'Test Firm'}, designSettings: {}, footerSettings: {footerLayout: 'anchor'}, locations: []},
    designTokens: {},
    heroSettings: siteHero,
  } as unknown as SiteChrome
}

// One page in the document at a time: `:root:has()` reads the whole document, as the browser does.
function page(c: SiteChrome, hero: React.ReactNode) {
  const {container, unmount} = render(<SiteShell chrome={c}>{hero}</SiteShell>)
  // The site header is the shell's first header (InternalPageHeader is a <header> too, inside <main>).
  const header = [...container.querySelectorAll('header')].find((h) => !h.closest('main'))!
  const out = {transparent: header.getAttribute('data-transparent'), css: applied(header), logo: header.querySelector('img')?.getAttribute('src')}
  unmount()
  return out
}

const SITE_LIGHT = {scheme: 'light'}
const SITE_DARK = {scheme: 'dark'}
const SITE_PHOTO = {scheme: 'light', backgroundImage: PHOTO}

const content: ResolvedHomeContent = {eyebrow: null, heading: 'Counsel you can call', description: null, ctas: [], galleryImages: [], videoUrl: null} as never
const config = (over: Partial<HeroConfig>): HeroConfig => ({...resolveHeroConfig({heading: 'Counsel you can call'} as never), ...over})
const surface = (dark: boolean, photo = false): ResolvedHeroSurface => ({
  scheme: dark ? 'dark' : 'light', isDark: dark, lightGround: 'tint', bgImage: photo ? (PHOTO as never) : null, hasImage: photo, fit: 'cover', foreground: null, hasForeground: false,
  scrimOpacity: 80, scrimStyle: 'flat', scrimColor: 'auto', scrimDirection: 'auto', sectionBg: null, hasSectionBg: false, sectionBgFit: 'cover',
})

describe('every hero says the ground at its top', () => {
  it('an inner page’s hero: its own photograph or scheme, else the site’s', () => {
    const ground = (siteHero: Record<string, unknown>, data: Record<string, unknown>) =>
      render(<SiteShell chrome={chrome(siteHero)}><InternalHero data={{heading: 'Family Law', ...data}} /></SiteShell>).container
        .querySelector('main section')!.getAttribute('data-hero-ground')
    expect(ground(SITE_LIGHT, {})).toBe('light')
    expect(ground(SITE_LIGHT, {backgroundImage: PHOTO})).toBe('dark')
    expect(ground(SITE_DARK, {schemeOverride: 'light'})).toBe('light')
    expect(ground(SITE_PHOTO, {backgroundNone: true})).toBe('light')
    expect(ground(SITE_PHOTO, {})).toBe('dark')
  })

  it('the fallback band, the site’s', () => {
    const ground = (siteHero: Record<string, unknown>) =>
      render(<SiteShell chrome={chrome(siteHero)}><InternalPageHeader title="Blog" /></SiteShell>).container
        .querySelector('main header')!.getAttribute('data-hero-ground')
    expect(ground(SITE_LIGHT)).toBe('light')
    expect(ground(SITE_DARK)).toBe('dark')
    expect(ground(SITE_PHOTO)).toBe('dark')
  })

  it('the homepage hero, its own band', () => {
    const ground = (el: React.ReactElement) => render(el).container.querySelector('section')!.getAttribute('data-hero-ground')
    expect(ground(<Overlay config={config({skeleton: 'overlay', backdrop: 'image'})} content={content} surface={surface(true, true)} />)).toBe('dark')
    expect(ground(<Overlay config={config({skeleton: 'overlay', backdrop: 'none'})} content={content} surface={surface(false)} />)).toBe('light')
    expect(ground(<Split config={config({skeleton: 'split'})} content={content} surface={surface(false, true)} />)).toBe('light')
    expect(ground(<Split config={config({skeleton: 'split', splitImageStyle: 'full'})} content={content} surface={surface(true, true)} />)).toBe('dark')
  })
})

describe('every header layout says when it is transparent, and only then', () => {
  const LAYOUTS = ['apex', 'ledge', 'mesa', 'spire', 'prism', 'crest', 'ridge'] as const
  const BASE: HeaderData = {firmName: 'Test Firm', logoOnLight: LOGO('/on-light.png'), logoOnDark: LOGO('/on-dark.png'), sticky: true, heroMerge: true, stickyHideSupplementary: true, compactStyle: 'docked', navItems: [{label: 'Home', href: '/'}]}
  const mark = (data: HeaderData, scrolled = false) => {
    Object.defineProperty(window, 'scrollY', {value: scrolled ? 400 : 0, writable: true, configurable: true})
    const {container, unmount} = render(<Header data={data} />)
    if (scrolled) act(() => { window.dispatchEvent(new Event('scroll')) })
    const value = container.querySelector('header')!.getAttribute('data-transparent')
    unmount()
    return value
  }
  for (const layout of LAYOUTS) {
    it(`${layout}`, () => {
      expect(mark({...BASE, headerLayout: layout, defaultScheme: 'transparent-light', scrolledScheme: 'dark'})).toBe('light')
      expect(mark({...BASE, headerLayout: layout, defaultScheme: 'transparent-dark', scrolledScheme: 'light'})).toBe('dark')
      expect(mark({...BASE, headerLayout: layout, defaultScheme: 'transparent-dark', scrolledScheme: 'light'}, true)).toBeNull()
      expect(mark({...BASE, headerLayout: layout, defaultScheme: 'light', scrolledScheme: 'light'})).toBeNull()
      expect(mark({...BASE, headerLayout: layout, defaultScheme: 'glass-dark', scrolledScheme: 'light'})).toBeNull()
    })
  }
})

describe('backlog 458: an inner page whose hero disagrees with the site’s', () => {
  it('a light site hero, a page with its own photograph: the header turns solid light, its words and logo as the light bar’s', () => {
    const p = page(chrome(SITE_LIGHT), <InternalHero data={{heading: 'Family Law', backgroundImage: PHOTO}} />)
    expect(p.transparent).toBe('light')
    expect(p.css['background-color']).toBe('var(--color-background)')
    expect(p.logo).toBe('/on-light.png')
    // The photograph's floor colors are for a header standing on the photograph; this one stands on its own ground.
    expect(p.css['--color-action-text']).toBeUndefined()
    expect(p.css['--color-accent-text']).toBeUndefined()
  })

  it('a dark site hero, a page that sets its own light scheme: the header turns solid dark', () => {
    const p = page(chrome(SITE_DARK), <InternalHero data={{heading: 'Family Law', schemeOverride: 'light'}} />)
    expect(p.transparent).toBe('dark')
    expect(p.css['background-color']).toBe('var(--color-brand-dark)')
    expect(p.logo).toBe('/on-dark.png')
  })

  it('a site photograph, a page that turns it off on a light scheme: solid dark, and no ghost tiers on it', () => {
    const p = page(chrome(SITE_PHOTO), <InternalHero data={{heading: 'Family Law', backgroundNone: true, sectionBackgroundImage: PHOTO}} />)
    expect(p.css['background-color']).toBe('var(--color-brand-dark)')
    // The dark header's own tiers, not the ghost band's light ones.
    expect(p.css['--color-foreground-muted']).toBe('var(--color-foreground-muted-on-dark)')
  })

  it('a page that agrees with the site stays transparent, as before', () => {
    for (const [site, data, floor] of [
      [SITE_LIGHT, {}, false],
      [SITE_DARK, {backgroundImage: PHOTO}, true],
      [SITE_PHOTO, {}, true],
      [SITE_DARK, {}, false],
    ] as const) {
      const p = page(chrome(site), <InternalHero data={{heading: 'Family Law', ...data}} />)
      expect(p.css['background-color'], JSON.stringify(site)).toBeUndefined()
      // Over a photograph the header still takes the photograph's floor colors (monorepo backlog 321).
      expect(p.css['--color-action-text'] === 'var(--color-foreground-on-dark)', JSON.stringify(site)).toBe(floor)
    }
    // The fallback band is the site's own hero, so it always agrees.
    for (const site of [SITE_LIGHT, SITE_DARK, SITE_PHOTO]) {
      expect(page(chrome(site), <InternalPageHeader title="Blog" />).css['background-color']).toBeUndefined()
    }
  })

  it('a page with no hero at all leaves the header as it was', () => {
    expect(page(chrome(SITE_LIGHT), <p>No hero</p>).css['background-color']).toBeUndefined()
  })
})

describe('backlog 397: the homepage hero disagreeing with the inner pages’ hero', () => {
  it('inner pages light, a homepage photograph (ADV-17B4-A’s 1.02:1): the header turns solid light', () => {
    const p = page(chrome(SITE_LIGHT), <Overlay config={config({skeleton: 'overlay', backdrop: 'image'})} content={content} surface={surface(true, true)} />)
    expect(p.css['background-color']).toBe('var(--color-background)')
  })

  it('inner pages dark, a light Split homepage: the header turns solid dark', () => {
    const p = page(chrome(SITE_DARK), <Split config={config({skeleton: 'split', splitImageStyle: 'full'})} content={content} surface={surface(false, true)} />)
    expect(p.css['background-color']).toBe('var(--color-brand-dark)')
  })

  it('a homepage that agrees stays transparent', () => {
    expect(page(chrome(SITE_DARK), <Overlay config={config({skeleton: 'overlay', backdrop: 'image'})} content={content} surface={surface(true, true)} />).css['background-color']).toBeUndefined()
    expect(page(chrome(SITE_LIGHT), <Split config={config({skeleton: 'split'})} content={content} surface={surface(false, true)} />).css['background-color']).toBeUndefined()
  })
})
