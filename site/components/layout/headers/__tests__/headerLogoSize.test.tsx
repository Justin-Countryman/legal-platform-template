import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {act, render} from '@testing-library/react'

// THE HEADER DRAWS THE LOGO'S INK AT ITS SHAPE'S SIZE (Phase 18 session B, item 3; monorepo `[R-603]`).
//
// A throwaway's logo was a square PNG whose ink filled half its height, drawn 80px tall at rest and 36px compacted: its
// words 7px and under 4px. Every layout now draws the file's trimmed rectangle (`logoFacts`), cropped by the box it sits
// in, at the height its shape earns (`logoSize`), at rest, compacted and on the phone.

vi.mock('next/navigation', () => ({usePathname: () => '/'}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: {src: string; alt: string; style?: React.CSSProperties; className?: string}) => <img src={p.src} alt={p.alt} style={p.style} className={p.className} />,
}))

import {Header} from '../../Header'
import {type HeaderData} from '../shared'
import {logoHeight} from '@/lib/logoSize'

class NoResize {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const LAYOUTS = ['apex', 'ledge', 'mesa', 'spire', 'prism', 'crest', 'ridge'] as const
const MOBILE = ['standard', 'bar-top', 'bar-bottom', 'phone-split', 'logo-split'] as const
const TRIM = {left: 0.041, top: 0.2373, width: 0.9132, height: 0.5323}
const STACKED = {src: '/stacked.png', alt: 'Test Firm', width: 438, height: 434, facts: {box: 'white' as const, trim: TRIM}}
const ASPECT = (438 * TRIM.width) / (434 * TRIM.height)

const BASE: HeaderData = {
  firmName: 'Test Firm',
  logoOnLight: STACKED,
  logoOnDark: {...STACKED, src: '/stacked-dark.png'},
  sticky: true,
  heroMerge: false,
  stickyHideSupplementary: true,
  compactStyle: 'docked',
  headerPhone: '(763) 555-0100',
  headerCtaLabel: 'Contact',
  headerCtaUrl: '/contact/',
  navItems: [{label: 'Home', href: '/'}],
}

function setScroll(y: number) {
  Object.defineProperty(window, 'scrollY', {value: y, writable: true, configurable: true})
}
function boxes(data: HeaderData, scrolled = false) {
  setScroll(scrolled ? 400 : 0)
  const utils = render(<Header data={data} />)
  if (scrolled) act(() => { window.dispatchEvent(new Event('scroll')) })
  return [...utils.container.querySelectorAll<HTMLElement>('[data-logo-box]')]
}
const px = (v: string) => Number.parseFloat(v)
/** The height the box draws at its widest: its width over its aspect ratio (the box never takes a fixed height). */
const drawnHeight = (b: HTMLElement) => px(b.style.width) / Number.parseFloat(b.style.aspectRatio)

beforeEach(() => { vi.stubGlobal('ResizeObserver', NoResize) })
afterEach(() => { vi.unstubAllGlobals(); setScroll(0) })

describe('the header draws the logo’s trimmed ink at its shape’s height', () => {
  for (const layout of LAYOUTS) {
    it(`${layout}: at rest the desktop logo is ${Math.round(logoHeight(ASPECT, 'rest'))}px tall, cropped to its ink`, () => {
      const all = boxes({...BASE, headerLayout: layout})
      const desktop = all.find((b) => b.dataset.logoBox === 'rest')!
      expect(desktop, 'a desktop logo box').toBeDefined()
      expect(drawnHeight(desktop)).toBeCloseTo(logoHeight(ASPECT, 'rest'), 1)
      expect(Number.parseFloat(desktop.style.aspectRatio)).toBeCloseTo(ASPECT, 3)
      // The file is drawn larger than its box, offset so the box shows the ink only.
      const img = desktop.querySelector('img')!
      expect(px(img.style.width)).toBeCloseTo(100 / TRIM.width, 1)
      expect(px(img.style.top)).toBeCloseTo((-TRIM.top / TRIM.height) * 100, 1)
    })

    it(`${layout}: compacted, the logo keeps its shape’s larger compact height`, () => {
      const desktop = boxes({...BASE, headerLayout: layout}, true).find((b) => b.dataset.logoBox === 'compact')!
      expect(desktop, 'a compact logo box').toBeDefined()
      expect(drawnHeight(desktop)).toBeCloseTo(logoHeight(ASPECT, 'compact'), 1)
    })
  }

  for (const mobileLayout of MOBILE) {
    it(`the ${mobileLayout} phone row draws it at its phone height`, () => {
      const row = boxes({...BASE, mobileLayout}).find((b) => b.dataset.logoBox?.startsWith('phone'))!
      expect(row, 'a phone logo box').toBeDefined()
      const size = mobileLayout === 'phone-split' || mobileLayout === 'logo-split' ? 'phoneSplit' : 'phone'
      expect(drawnHeight(row)).toBeCloseTo(logoHeight(ASPECT, size), 1)
    })
  }

  it('a logo with no facts is drawn whole at its file’s shape: a 3 to 1 wordmark 80px at rest, as before', () => {
    const wide = {src: '/wide.png', alt: 'Test Firm', width: 360, height: 120}
    const desktop = boxes({...BASE, logoOnLight: wide, logoOnDark: wide}).find((b) => b.dataset.logoBox === 'rest')!
    expect(drawnHeight(desktop)).toBeCloseTo(logoHeight(3, 'rest'), 1)
    expect(desktop.querySelector('img')!.style.top).toBe('0%')
  })
})

// The pre-report break pass (Phase 18 session B): compacted, a header draws the logo's mark where one exists, another
// file with its own shape. The box must be a new one, not the wordmark's box animating its width from 352px down to the
// mark's (measured in Chromium and WebKit: a 352 by 352 box for the first frames of the 400ms transition).
describe('compacted, the mark is drawn in a box of its own', () => {
  for (const layout of LAYOUTS) {
    it(`${layout}: a new box at the mark’s shape, not the wordmark’s box resized`, () => {
      const wordmark = {src: '/wordmark.png', alt: 'Test Firm', width: 440, height: 100}
      const mark = {src: '/mark.png', alt: 'Test Firm', width: 200, height: 200}
      const data = {...BASE, headerLayout: layout, logoOnLight: wordmark, logoOnDark: wordmark, logoMarkOnLight: mark, logoMarkOnDark: mark}
      setScroll(0)
      const utils = render(<Header data={data} />)
      const atRest = utils.container.querySelector<HTMLElement>('[data-logo-box="rest"]')!
      setScroll(400)
      act(() => { window.dispatchEvent(new Event('scroll')) })
      const compact = utils.container.querySelector<HTMLElement>('[data-logo-box="compact"]')!
      expect(compact).not.toBe(atRest)
      expect(Number.parseFloat(compact.style.aspectRatio)).toBeCloseTo(1, 3)
      expect(compact.querySelector('img')!.getAttribute('src')).toBe('/mark.png')
    })
  }
})
