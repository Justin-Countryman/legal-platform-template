import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {render} from '@testing-library/react'

// THE HEADER MATCHES A LOGO THAT CARRIES ITS OWN BOX (Phase 18 session B, item 4; monorepo `[R-603]`).
//
// Justin, of a throwaway: "the header has a logo with a white bg so the bg of the section should be white so there is not
// that weird contrast". The light header painted the page's light ground, cream on seven of the fifteen presets, so a logo
// on its own white box showed the box. Now a white box is drawn into a solid light ground (`mix-blend-multiply`, measured
// by ADV-18B-B: ΔE 8.60 to 0.00 on a cream header, the page keeping its color) and a black box into a solid dark ground
// (`screen`); a boxed logo turns a glass or transparent header solid, which blending needs; and a logo for dark grounds
// that carries a white or colored box cannot sit on the dark header, which then stays light.

vi.mock('next/navigation', () => ({usePathname: () => '/family-law/'}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: {src: string; alt: string; className?: string; style?: React.CSSProperties}) => <img src={p.src} alt={p.alt} className={p.className} style={p.style} />,
}))

import {Header} from '../../Header'
import {type HeaderData} from '../shared'
import {SiteShell, type SiteChrome} from '../../SiteShell'
import {chromeSchemes, darkHeaderReady, flowById} from '@/lib/flows'
import {ReviewPageContent} from '@/components/review/ReviewPageContent'
import {solidBehindBox} from '@/components/ui/LogoImage'
import type {LogoBox} from '@/lib/logoFacts'

class NoResize {
  observe() {}
  unobserve() {}
  disconnect() {}
}
beforeEach(() => { vi.stubGlobal('ResizeObserver', NoResize) })
afterEach(() => { vi.unstubAllGlobals() })

const logo = (src: string, box: string | null) => ({src, alt: 'Test Firm', width: 300, height: 100, facts: box ? {box, trim: null} : null}) as never
const LAYOUTS = ['apex', 'ledge', 'mesa', 'spire', 'prism', 'crest', 'ridge'] as const
const imgClasses = (root: Element) => [...root.querySelectorAll('[data-logo-box] img')].map((i) => (i.getAttribute('class') ?? '').split(/\s+/))

function header(data: Partial<HeaderData>) {
  const base: HeaderData = {firmName: 'Test Firm', navItems: [{label: 'Home', href: '/'}], headerLayout: 'apex', sticky: false, heroMerge: false}
  return render(<Header data={{...base, ...data}} />).container
}

describe('a boxed logo is drawn into the header’s ground', () => {
  for (const headerLayout of LAYOUTS) {
    it(`${headerLayout}: a white box on the light header multiplies away, desktop and phone alike; a clear logo is left alone`, () => {
      const boxed = imgClasses(header({headerLayout, defaultScheme: 'light', scrolledScheme: 'light', logoOnLight: logo('/light.png', 'white'), logoOnDark: logo('/dark.png', 'clear')}))
      expect(boxed.length).toBeGreaterThan(0)
      for (const c of boxed) expect(c).toContain('mix-blend-multiply')
      const clear = imgClasses(header({headerLayout, defaultScheme: 'light', scrolledScheme: 'light', logoOnLight: logo('/light.png', 'clear'), logoOnDark: logo('/dark.png', 'clear')}))
      expect(clear.length).toBeGreaterThan(0)
      for (const c of clear) expect(c.some((x) => x.startsWith('mix-blend'))).toBe(false)
    })

    it(`${headerLayout}: a black box on the dark header screens away; a white box is never multiplied into a dark ground`, () => {
      const black = imgClasses(header({headerLayout, defaultScheme: 'dark', scrolledScheme: 'dark', logoOnLight: logo('/light.png', 'clear'), logoOnDark: logo('/dark.png', 'black')}))
      expect(black.length).toBeGreaterThan(0)
      for (const c of black) expect(c).toContain('mix-blend-screen')
      const white = imgClasses(header({headerLayout, defaultScheme: 'dark', scrolledScheme: 'dark', logoOnLight: logo('/light.png', 'clear'), logoOnDark: logo('/dark.png', 'white')}))
      expect(white.length).toBeGreaterThan(0)
      for (const c of white) expect(c).not.toContain('mix-blend-multiply')
    })
  }
})

const LOGO_FILE = (src: string, box: LogoBox | null) => ({src, alt: 'Test Firm', width: 300, height: 100, facts: box ? {box, trim: null} : null})
function chrome(design: Record<string, unknown>, nav: Record<string, unknown>, logos: Record<string, unknown>, footer: Record<string, unknown> = {}): SiteChrome {
  return {
    header: {siteSettings: {firmName: 'Test Firm'}, designSettings: logos, mainNavigation: {navItems: [], ...nav}},
    footer: {siteSettings: {firmName: 'Test Firm'}, designSettings: {logoOnDark: logos.logoOnDark, logoOnLight: logos.logoOnLight}, footerSettings: {footerLayout: 'anchor', ...footer}, locations: []},
    designTokens: design,
  } as unknown as SiteChrome
}
const cls = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/)

describe('the site shell gives a boxed logo a ground it can be drawn into', () => {
  it('a stored glass header turns solid light behind a boxed light logo, and stays glass behind a clear one', () => {
    const boxed = render(<SiteShell chrome={chrome({}, {defaultScheme: 'glass', scrolledScheme: 'glass'}, {logoOnLight: LOGO_FILE('/l.png', 'white'), logoOnDark: LOGO_FILE('/d.png', 'clear')})}><p /></SiteShell>).container
    expect(cls(boxed.querySelector('header'))).toContain('bg-background')
    expect(cls(boxed.querySelector('header'))).not.toContain('backdrop-blur-md')
    const clear = render(<SiteShell chrome={chrome({}, {defaultScheme: 'glass', scrolledScheme: 'glass'}, {logoOnLight: LOGO_FILE('/l.png', 'clear'), logoOnDark: LOGO_FILE('/d.png', 'clear')})}><p /></SiteShell>).container
    expect(cls(clear.querySelector('header'))).toContain('backdrop-blur-md')
  })

  it('turns the header solid only where the logo it draws will blend: the mark when compacted, never a colored box (the pre-report break pass)', () => {
    // A clear wordmark with a white-boxed mark: glass at the top (the wordmark), solid when compacted (the mark).
    const withMark = chrome({}, {defaultScheme: 'glass', scrolledScheme: 'glass', stickyHideSupplementary: true}, {logoOnLight: LOGO_FILE('/l.png', 'clear'), logoOnDark: LOGO_FILE('/d.png', 'clear'), logoMarkOnLight: LOGO_FILE('/m.png', 'white'), logoMarkOnDark: LOGO_FILE('/md.png', 'clear')})
    expect(cls(render(<SiteShell chrome={withMark}><p /></SiteShell>).container.querySelector('header'))).toContain('backdrop-blur-md')
    expect(solidBehindBox('glass', LOGO_FILE('/l.png', 'clear'))).toBe('glass')
    expect(solidBehindBox('glass', LOGO_FILE('/m.png', 'white'))).toBe('light')
    expect(solidBehindBox('glass-dark', LOGO_FILE('/md.png', 'black'))).toBe('dark')
    expect(solidBehindBox('transparent-dark', LOGO_FILE('/md.png', 'white'))).toBe('transparent-dark')
    expect(solidBehindBox('transparent-light', LOGO_FILE('/l.png', '#1c348c'))).toBe('transparent-light')
    expect(solidBehindBox('light', LOGO_FILE('/l.png', 'white'))).toBe('light')
    // A colored box cannot blend into either ground: a stored transparent header stays transparent over the hero.
    const colored = chrome({}, {defaultScheme: 'transparent-light', scrolledScheme: 'light', heroMerge: true}, {logoOnLight: LOGO_FILE('/l.png', '#1c348c'), logoOnDark: LOGO_FILE('/d.png', 'clear')})
    expect(cls(render(<SiteShell chrome={colored}><p /></SiteShell>).container.querySelector('header'))).toContain('bg-transparent')
  })

  it('the light footer multiplies a white-boxed logo away', () => {
    const c = render(<SiteShell chrome={chrome({flow: 'softWash.mostlyLight'}, {}, {logoOnLight: LOGO_FILE('/l.png', 'white'), logoOnDark: LOGO_FILE('/d.png', 'clear')})}><p /></SiteShell>).container
    const footerImg = c.querySelector('footer [data-logo-box] img')
    expect(cls(footerImg)).toContain('mix-blend-multiply')
  })

  it('the review page multiplies a white-boxed logo away', () => {
    const c = render(<ReviewPageContent page={{h1: 'Review us', blurb: null, reviewLinks: [], feedbackFormEmbed: null}} logo={LOGO_FILE('/l.png', 'white') as never} firmInfo={{firmName: 'Test Firm'} as never} napTokens={null} />).container
    expect(cls(c.querySelector('[data-logo-box] img'))).toContain('mix-blend-multiply')
  })
})

describe('a logo for dark grounds that carries a white or colored box keeps the theme’s dark header light', () => {
  const dark = flowById('cutBlocks.mostlyDark')!
  it('is not ready for a dark header, and the header stays light and says why', () => {
    for (const box of ['white', '#1c348c'] as LogoBox[]) {
      const logos = {onLight: LOGO_FILE('/l.png', 'clear'), onDark: LOGO_FILE('/d.png', box)}
      expect(darkHeaderReady(logos), box).toBe(false)
      expect(chromeSchemes(dark, null, null, logos)).toMatchObject({top: 'light', darkLogoMissing: true})
    }
    for (const box of ['black', 'clear', null] as (LogoBox | null)[]) expect(darkHeaderReady({onLight: LOGO_FILE('/l.png', 'clear'), onDark: LOGO_FILE('/d.png', box)}), String(box)).toBe(true)
  })
})
