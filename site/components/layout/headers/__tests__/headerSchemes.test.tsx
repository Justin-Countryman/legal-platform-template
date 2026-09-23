import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {act, render} from '@testing-library/react'

// Phase 17B session 4 (monorepo WS-V1-PHASE17B4-DESIGN §2.4): the seven layouts share three
// fixes, held here by rendering every layout at the top and scrolled.
//   1. The mobile row paints its own ground only when the header's own ground is see-through
//      (a stored transparent top, the floating pill); otherwise it shows the header's. It used
//      to paint the AT-TOP scheme after scrolling while its logo and the header's ring context
//      followed the scrolled one (a light top over a dark scroll measured 1.16:1, ADV-17B4-A).
//   2. A docked dark header, scrolled, draws a rule on its bottom edge.
//   3. A second number equal to the first is not printed.

vi.mock('next/navigation', () => ({usePathname: () => '/'}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: {src: string; alt: string}) => <img src={p.src} alt={p.alt} />,
}))

import {Header} from '../../Header'
import {secondPhone, mobileRowBg, schemeBg, type HeaderData} from '../shared'

class NoResize {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const LAYOUTS = ['apex', 'ledge', 'mesa', 'spire', 'prism', 'crest', 'ridge'] as const
const LOGO = (src: string) => ({src, alt: 'Test Firm', width: 120, height: 40})

const BASE: HeaderData = {
  firmName: 'Test Firm',
  logoOnLight: LOGO('/on-light.png'),
  logoOnDark: LOGO('/on-dark.png'),
  sticky: true,
  heroMerge: false,
  stickyHideSupplementary: true,
  compactStyle: 'docked',
  headerPhone: '(763) 555-0100',
  headerPhoneTagline: 'Call us',
  headerCtaLabel: 'Contact',
  headerCtaUrl: '/contact/',
  navItems: [{label: 'Home', href: '/'}],
}

function setScroll(y: number) {
  Object.defineProperty(window, 'scrollY', {value: y, writable: true, configurable: true})
}

function renderHeader(data: HeaderData, scrolled: boolean) {
  setScroll(scrolled ? 400 : 0)
  const utils = render(<Header data={data} />)
  if (scrolled) act(() => { window.dispatchEvent(new Event('scroll')) })
  const header = utils.container.querySelector('header')!
  // The mobile row is the header's first child when no top bar is drawn.
  const row = header.firstElementChild as HTMLElement
  const logos = [...row.querySelectorAll('img')].map((i) => i.getAttribute('src'))
  return {...utils, header, row, logos}
}

const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const grounds = (el: Element) => classes(el).filter((c) => /^bg-(background|brand-dark|scrim|transparent)/.test(c))

beforeEach(() => { vi.stubGlobal('ResizeObserver', NoResize) })
afterEach(() => { vi.unstubAllGlobals(); setScroll(0) })

describe('the mobile row follows the state the header is in (Phase 17B session 4)', () => {
  for (const layout of LAYOUTS) {
    it(`${layout}: a light top over a dark scroll, scrolled: the row shows the header's dark ground, its logo and ring context agree`, () => {
      const {header, row, logos} = renderHeader({...BASE, headerLayout: layout, defaultScheme: 'light', scrolledScheme: 'dark'}, true)
      expect(classes(header)).toContain('bg-brand-dark')
      expect(header.getAttribute('data-ring-context')).toBe('dark')
      expect(grounds(row)).toEqual([])
      expect(logos).toEqual(['/on-dark.png'])
    })

    it(`${layout}: a dark top over a light scroll, at the top: the row shows the dark ground with the dark-ground logo`, () => {
      const {header, row, logos} = renderHeader({...BASE, headerLayout: layout, defaultScheme: 'dark', scrolledScheme: 'light'}, false)
      expect(classes(header)).toContain('bg-brand-dark')
      expect(grounds(row)).toEqual([])
      expect(logos).toEqual(['/on-dark.png'])
    })

    it(`${layout}: a stored transparent top (merged over the hero): the row turns it solid, as before`, () => {
      const {header, row} = renderHeader({...BASE, headerLayout: layout, heroMerge: true, defaultScheme: 'transparent-dark', scrolledScheme: 'light'}, false)
      expect(classes(header)).toContain('bg-transparent')
      expect(grounds(row)).toEqual(['bg-brand-dark'])
    })

    it(`${layout}: the floating pill, scrolled: the outer header is see-through, so the row paints the scrolled ground`, () => {
      const {header, row} = renderHeader({...BASE, headerLayout: layout, compactStyle: 'float', defaultScheme: 'light', scrolledScheme: 'glass-dark'}, true)
      expect(classes(header)).toContain('bg-transparent')
      expect(grounds(row)).toEqual(['bg-scrim/80'])
    })

    it(`${layout}: a docked dark header draws the bottom rule when scrolled, a light one does not, and neither at the top`, () => {
      expect(classes(renderHeader({...BASE, headerLayout: layout, defaultScheme: 'dark', scrolledScheme: 'dark'}, true).header)).toContain('hairline-bottom')
      expect(classes(renderHeader({...BASE, headerLayout: layout, defaultScheme: 'light', scrolledScheme: 'light'}, true).header)).not.toContain('hairline-bottom')
      expect(classes(renderHeader({...BASE, headerLayout: layout, defaultScheme: 'dark', scrolledScheme: 'dark'}, false).header)).not.toContain('hairline-bottom')
    })

    it(`${layout}: a toll-free-only firm's number is printed as often as a firm with no second number`, () => {
      const tollFreeOnly = {...BASE, headerLayout: layout, headerPhone: null, tollFreePhone: '(800) 555-0199'}
      const count = (data: HeaderData) =>
        renderHeader(data, false).container.querySelectorAll('a[href="tel:8005550199"]').length
      expect(count({...tollFreeOnly, headerPhone2: '(800) 555-0199'})).toBe(count({...tollFreeOnly, headerPhone2: null}))
    })
  }
})

describe('the helpers', () => {
  it('secondPhone drops a number equal to the first, whatever its punctuation', () => {
    expect(secondPhone('(800) 555-0199', '800-555-0199')).toBeNull()
    expect(secondPhone('(763) 555-0100', '(800) 555-0199')).toBe('(800) 555-0199')
    expect(secondPhone(null, '(800) 555-0199')).toBe('(800) 555-0199')
    expect(secondPhone('(763) 555-0100', null)).toBeNull()
  })

  it('mobileRowBg paints only a see-through header, solid', () => {
    expect(mobileRowBg('light', false)).toBe('')
    expect(mobileRowBg('dark', false)).toBe('')
    expect(mobileRowBg('transparent-light', false)).toBe('bg-background')
    expect(mobileRowBg('transparent-dark', false)).toBe('bg-brand-dark')
    expect(mobileRowBg('glass', true)).toBe('bg-background/90 backdrop-blur-md')
  })

  it('schemeBg adds the rule to a docked dark scroll only', () => {
    expect(schemeBg('dark', true)).toContain('hairline-bottom')
    expect(schemeBg('glass-dark', true)).toContain('hairline-bottom')
    expect(schemeBg('light', true)).not.toContain('hairline-bottom')
    expect(schemeBg('dark', true, true)).not.toContain('hairline-bottom')
    expect(schemeBg('dark', false)).not.toContain('hairline-bottom')
  })
})
