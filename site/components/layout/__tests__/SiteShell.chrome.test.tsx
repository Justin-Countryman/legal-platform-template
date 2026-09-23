import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {render} from '@testing-library/react'

// Phase 17B session 4 (monorepo WS-V1-PHASE17B4-DESIGN §2.3, `[R-518]`): the site shell reads
// the theme's header and footer schemes where Header Settings and Footer Settings store none,
// a stored scheme winning per field. Rendered whole, on every page, so the theme reaches the
// header and footer of an interior page too, as the carry does.

vi.mock('next/navigation', () => ({usePathname: () => '/family-law/'}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: {src: string; alt: string}) => <img src={p.src} alt={p.alt} />,
}))

import {SiteShell, type SiteChrome} from '../SiteShell'

class NoResize {
  observe() {}
  unobserve() {}
  disconnect() {}
}
beforeEach(() => { vi.stubGlobal('ResizeObserver', NoResize) })
afterEach(() => { vi.unstubAllGlobals() })

const LOGO = (src: string) => ({src, alt: 'Test Firm', width: 120, height: 40})

function chrome(design: Record<string, unknown>, nav: Record<string, unknown> = {}, footer: Record<string, unknown> = {}, logos = {logoOnLight: LOGO('/on-light.png'), logoOnDark: LOGO('/on-dark.png')}): SiteChrome {
  return {
    header: {siteSettings: {firmName: 'Test Firm'}, designSettings: logos, mainNavigation: {navItems: [], ...nav}},
    footer: {siteSettings: {firmName: 'Test Firm'}, designSettings: {logoOnDark: logos.logoOnDark, logoOnLight: logos.logoOnLight}, footerSettings: {footerLayout: 'anchor', ...footer}, locations: []},
    designTokens: design,
  } as unknown as SiteChrome
}

function shell(c: SiteChrome) {
  const {container} = render(<SiteShell chrome={c}><p>page</p></SiteShell>)
  const header = container.querySelector('header')!
  const footerEl = container.querySelector('footer')!
  const cls = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)
  return {
    header: {dark: cls(header).includes('bg-brand-dark'), ring: header.getAttribute('data-ring-context')},
    footer: {dark: cls(footerEl).includes('bg-brand-dark'), ring: footerEl.getAttribute('data-ring-context')},
  }
}

describe('the site shell draws the theme’s header and footer (Phase 17B session 4)', () => {
  it('under Cut blocks at mostly dark, with nothing stored: a dark header and a dark footer, with the dark ring context', () => {
    const s = shell(chrome({flow: 'cutBlocks.mostlyDark'}))
    expect(s.header).toEqual({dark: true, ring: 'dark'})
    expect(s.footer).toEqual({dark: true, ring: 'dark'})
  })

  it('under Quiet, with nothing stored: the white bar and the dark footer every client wears today', () => {
    const s = shell(chrome({flow: 'quiet.mostlyLight'}))
    expect(s.header).toEqual({dark: false, ring: null})
    expect(s.footer.dark).toBe(true)
  })

  it('nothing stored and no theme: the platform default, as before this session', () => {
    const s = shell(chrome({}))
    expect(s.header).toEqual({dark: false, ring: null})
    expect(s.footer.dark).toBe(true)
  })

  it('a stored scheme wins over the theme, per field', () => {
    const s = shell(chrome({flow: 'cutBlocks.mostlyDark'}, {defaultScheme: 'light'}, {footerScheme: 'light'}))
    expect(s.header).toEqual({dark: false, ring: null})
    expect(s.footer).toEqual({dark: false, ring: null})
  })

  it('a client storing the six retired fields renders its header and footer as before (the bridge)', () => {
    const s = shell(chrome({sectionJoin: 'angled', patternGround: 'dark'}))
    expect(s.header.dark).toBe(false)
    expect(s.footer.dark).toBe(true)
  })

  it('the light logo without the dark one keeps a dark theme’s header light', () => {
    const s = shell(chrome({flow: 'cutBlocks.mostlyDark'}, {}, {}, {logoOnLight: LOGO('/on-light.png'), logoOnDark: null as never}))
    expect(s.header.dark).toBe(false)
    expect(s.footer.dark).toBe(true)
  })
})
