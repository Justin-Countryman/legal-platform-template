import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {render, act} from '@testing-library/react'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'

// `useReducedMotion` is the platform's reduced-motion decision mechanism (see
// the component). Mocked here so each test can set the preference directly;
// jsdom has no matchMedia, so the real hook would always report "not reduced".
let mockReduce: boolean | null = false
vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockReduce,
}))

import {
  ScrollReveal,
  REVEAL_DISTANCE_PX,
  REVEAL_DURATION_MS,
  REVEAL_EASING,
  REVEAL_THRESHOLD,
  REVEAL_SCREEN_MARGIN,
} from '../ScrollReveal'

// ─── IntersectionObserver harness ─────────────────────────────────────────────

type ObserverRecord = {
  options?: IntersectionObserverInit
  observed: Element[]
  disconnected: number
  fire: (isIntersecting: boolean) => void
}

let observers: ObserverRecord[] = []
// Records the order of the two operations whose sequence is load-bearing:
// the observer must be attached BEFORE any state is applied to the element.
let opLog: string[] = []
let constructorThrows = false

function installObserver() {
  class MockIntersectionObserver {
    constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      if (constructorThrows) throw new Error('IntersectionObserver unavailable')
      const record: ObserverRecord = {
        options,
        observed: [],
        disconnected: 0,
        fire: (isIntersecting) =>
          cb(
            [{isIntersecting} as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
      }
      this.record = record
      observers.push(record)
    }
    record: ObserverRecord
    observe(el: Element) {
      this.record.observed.push(el)
      opLog.push('observe')
    }
    disconnect() {
      this.record.disconnected += 1
    }
    unobserve() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  }
  ;(globalThis as {IntersectionObserver?: unknown}).IntersectionObserver =
    MockIntersectionObserver
}

/** jsdom's window.innerHeight is 768. Below fold = top beyond it. */
function stubRect(top: number, bottom = top + 200) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom,
    left: 0,
    right: 0,
    width: 100,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect)
}

const BELOW_FOLD = 1000
const IN_VIEWPORT = 100

function renderProbe() {
  // A plain probe child, not a block. Phase 2 builds the primitive; it has no
  // consumer and does not get one to make its tests pass.
  const utils = render(
    <ScrollReveal>
      <p>probe</p>
    </ScrollReveal>,
  )
  const wrapper = utils.container.firstChild as HTMLElement
  return {...utils, wrapper}
}

beforeEach(() => {
  observers = []
  opLog = []
  constructorThrows = false
  mockReduce = false
  installObserver()
})

afterEach(() => {
  vi.restoreAllMocks()
  delete (globalThis as {IntersectionObserver?: unknown}).IntersectionObserver
})

// ─── The governing rule: transform only, never opacity ────────────────────────
//
// If this section fails, the primitive has acquired the failure mode it was
// designed to eliminate: content that can end up invisible with nothing
// reporting it. Do not "fix" a failure here by updating the expectation.

describe('ScrollReveal — transform only, no opacity in any state', () => {
  const SOURCE = readFileSync(
    join(__dirname, '..', 'ScrollReveal.tsx'),
    'utf8',
  )

  it('the source sets no opacity anywhere', () => {
    // Source-text scan, matching the repo's queries.test.ts posture: the
    // strongest form of "no code path does X" is that X is not in the file.
    // The prose comments explain why opacity is forbidden, so strip comments
    // before scanning rather than banning the word outright.
    const code = SOURCE.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).not.toMatch(/opacity/i)
    expect(code).not.toMatch(/\bfade\b/i)
  })

  it('never sets opacity on the element in the offset state', () => {
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    expect(wrapper.dataset.reveal).toBe('offset')
    expect(wrapper.style.opacity).toBe('')
  })

  it('never sets opacity on the element in the revealed state', () => {
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    act(() => observers[0].fire(true))
    expect(wrapper.style.opacity).toBe('')
  })

  it('never transitions opacity — the wrapper names no transition of its own', () => {
    // The transition is globals.css's, on the band's content, and names transform
    // only; the wrapper carries values, never a transition or an opacity.
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    act(() => observers[0].fire(true))
    expect(wrapper.style.transition).toBe('')
    expect(wrapper.getAttribute('style')).not.toMatch(/opacity/i)
  })

  it('offset content is painted, not hidden — no display, visibility or clip', () => {
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    expect(wrapper.style.display).toBe('')
    expect(wrapper.style.visibility).toBe('')
    expect(wrapper.style.clipPath).toBe('')
    expect(wrapper.textContent).toBe('probe')
  })
})

// ─── Never hidden on the server, never a CSS default ──────────────────────────

describe('ScrollReveal — the server-rendered state carries no styles', () => {
  it('renders no style attribute before any effect runs', async () => {
    // Direct evidence for "never hidden on the server": the markup a browser
    // receives has no transform, so a client that never runs JS, fails to
    // hydrate, or hydrates slowly shows the content in place.
    const {renderToString} = await import('react-dom/server')
    // Expected in jsdom: React warns that useLayoutEffect does nothing on the
    // server. The component picks useEffect when `window` is undefined, which
    // is the real server; jsdom defines it, so the warning is a test-env
    // artifact rather than a defect.
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})
    const html = renderToString(
      <ScrollReveal>
        <p>probe</p>
      </ScrollReveal>,
    )
    warn.mockRestore()
    expect(html).toContain('probe')
    expect(html).not.toContain('style=')
    expect(html).not.toContain('transform')
    expect(html).not.toContain('data-reveal')
  })
})

// ─── Content at or above the fold is never touched ────────────────────────────

describe('ScrollReveal — at-or-above-the-fold content is left alone', () => {
  it('applies no styles to an element already in the viewport at mount', () => {
    stubRect(IN_VIEWPORT)
    const {wrapper} = renderProbe()
    expect(wrapper.getAttribute('style')).toBeNull()
    expect(wrapper.dataset.reveal).toBeUndefined()
  })

  it('attaches no observer for an element already in the viewport', () => {
    // This is what makes the primitive incapable of regressing LCP: the LCP
    // element is painted in the initial viewport, so it never enters the
    // offset path at all.
    stubRect(IN_VIEWPORT)
    renderProbe()
    expect(observers.length).toBe(0)
  })

  it('leaves an element scrolled above the viewport alone', () => {
    stubRect(-500, -100)
    const {wrapper} = renderProbe()
    expect(wrapper.getAttribute('style')).toBeNull()
    expect(observers.length).toBe(0)
  })

  it('treats an element straddling the fold as in-viewport', () => {
    stubRect(700, 900) // top inside the 768px viewport, bottom below it
    const {wrapper} = renderProbe()
    expect(wrapper.getAttribute('style')).toBeNull()
    expect(observers.length).toBe(0)
  })
})

// ─── The below-fold reveal path ───────────────────────────────────────────────

describe('ScrollReveal — below-fold content offsets then reveals', () => {
  it('offsets by the approved distance once armed', () => {
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    expect(wrapper.dataset.reveal).toBe('offset')
    expect(wrapper.style.getPropertyValue('--reveal-distance')).toBe(`${REVEAL_DISTANCE_PX}px`)
  })

  it('applies no transition while offset, so arming does not animate downward', () => {
    // globals.css transitions the content only under `data-reveal="revealed"`.
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    expect(wrapper.dataset.reveal).toBe('offset')
    expect(wrapper.style.transition).toBe('')
  })

  it('observes the wrapper element at the approved threshold, and at 15% of the screen', () => {
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    expect(observers.length).toBe(2)
    expect(observers[0].observed).toEqual([wrapper])
    expect(observers[0].options?.threshold).toBe(REVEAL_THRESHOLD)
    expect(observers[1].observed).toEqual([wrapper])
    expect(observers[1].options?.rootMargin).toBe('0px 0px -15% 0px')
    expect(observers[1].options?.threshold).toBe(0)
    expect(REVEAL_SCREEN_MARGIN).toBe('0px 0px -15% 0px')
  })

  it('attaches the observers BEFORE applying the offset', () => {
    // Ordering is the ruling-1 guarantee: if construction or observe() throws,
    // no state has been applied and the element renders as the server sent it.
    stubRect(BELOW_FOLD)
    renderProbe()
    expect(opLog).toEqual(['observe', 'observe'])
  })

  it('reveals to its resting position with the approved motion on intersection', () => {
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    act(() => observers[0].fire(true))
    expect(wrapper.dataset.reveal).toBe('revealed')
    expect(wrapper.style.getPropertyValue('--reveal-duration')).toBe(`${REVEAL_DURATION_MS}ms`)
    expect(wrapper.style.getPropertyValue('--reveal-easing')).toBe(REVEAL_EASING)
  })

  it('ignores a non-intersecting callback', () => {
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    act(() => observers[0].fire(false))
    expect(wrapper.dataset.reveal).toBe('offset')
  })

  it('reveals a band taller than the screen by its second trigger', () => {
    // A threshold is a share of the band's own area: a band taller than the screen
    // divided by 0.15 never reaches it, and stayed offset for good (measured).
    stubRect(BELOW_FOLD, BELOW_FOLD + 8000)
    const {wrapper} = renderProbe()
    act(() => observers[1].fire(true))
    expect(wrapper.dataset.reveal).toBe('revealed')
    expect(observers.every((o) => o.disconnected >= 1)).toBe(true)
  })

  it('never moves the wrapper itself, so the band ground stays put in every phase', () => {
    // globals.css moves `[data-band-content]` inside the band; the wrapper (and the
    // band's ground with it) stays where the page lays it out.
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    expect(wrapper.style.transform).toBe('')
    act(() => observers[0].fire(true))
    expect(wrapper.style.transform).toBe('')
  })
})

// ─── Reveal once ──────────────────────────────────────────────────────────────

describe('ScrollReveal — reveals once and stays revealed', () => {
  it('disconnects both observers on reveal', () => {
    stubRect(BELOW_FOLD)
    renderProbe()
    act(() => observers[0].fire(true))
    expect(observers[0].disconnected).toBeGreaterThanOrEqual(1)
    expect(observers[1].disconnected).toBeGreaterThanOrEqual(1)
  })

  it('does not re-hide when the element leaves the viewport again', () => {
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    act(() => observers[0].fire(true))
    act(() => observers[0].fire(false))
    expect(wrapper.dataset.reveal).toBe('revealed')
  })

  it('does not re-animate on a second intersection', () => {
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    act(() => observers[0].fire(true))
    act(() => observers[1].fire(true))
    expect(wrapper.dataset.reveal).toBe('revealed')
    expect(observers.length).toBe(2)
  })
})

// ─── Reduced motion means no motion ───────────────────────────────────────────

describe('ScrollReveal — reduced motion', () => {
  it('applies no styles at all when reduced motion is preferred', () => {
    mockReduce = true
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    expect(wrapper.getAttribute('style')).toBeNull()
    expect(wrapper.dataset.reveal).toBeUndefined()
  })

  it('attaches no observer when reduced motion is preferred', () => {
    // No motion, not less motion: there is no transition to shorten because
    // there is no offset to transition from.
    mockReduce = true
    stubRect(BELOW_FOLD)
    renderProbe()
    expect(observers.length).toBe(0)
  })

  it('renders content in place and complete under reduced motion', () => {
    mockReduce = true
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    expect(wrapper.textContent).toBe('probe')
    expect(wrapper.style.transform).toBe('')
    expect(wrapper.style.transition).toBe('')
  })

  it('treats a null preference (SSR / pre-mount) as not reduced', () => {
    mockReduce = null
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    expect(wrapper.dataset.reveal).toBe('offset')
  })
})

// ─── Failure paths leave content untouched ────────────────────────────────────

describe('ScrollReveal — every failure path falls back to visible, in place', () => {
  it('applies no styles when IntersectionObserver is unavailable', () => {
    delete (globalThis as {IntersectionObserver?: unknown}).IntersectionObserver
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    expect(wrapper.getAttribute('style')).toBeNull()
    expect(wrapper.dataset.reveal).toBeUndefined()
    expect(wrapper.textContent).toBe('probe')
  })

  it('applies no styles when the observer constructor throws', () => {
    constructorThrows = true
    stubRect(BELOW_FOLD)
    const {wrapper} = renderProbe()
    expect(wrapper.getAttribute('style')).toBeNull()
    expect(wrapper.dataset.reveal).toBeUndefined()
    expect(wrapper.textContent).toBe('probe')
  })

  it('renders children unchanged regardless of path', () => {
    stubRect(BELOW_FOLD)
    const {container} = render(
      <ScrollReveal className="custom">
        <p>probe</p>
      </ScrollReveal>,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toBe('custom')
    expect(wrapper.querySelector('p')?.textContent).toBe('probe')
  })
})

// ─── Approved motion values ───────────────────────────────────────────────────

describe('ScrollReveal — the approved motion values', () => {
  it('exports the values Justin approved 2026-07-20', () => {
    // Pinned so a change to the platform's reveal motion is a deliberate edit
    // to an approved constant rather than a drifting inline value.
    expect(REVEAL_DISTANCE_PX).toBe(24)
    expect(REVEAL_DURATION_MS).toBe(600)
    expect(REVEAL_EASING).toBe('cubic-bezier(0.33, 1, 0.68, 1)')
    expect(REVEAL_THRESHOLD).toBe(0.15)
  })
})
