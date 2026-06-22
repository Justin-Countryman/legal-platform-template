import {describe, it, expect, vi} from 'vitest'
import {render, screen} from '@testing-library/react'

// Mock framer-motion to capture the MotionConfig invocation; verifies
// MotionRoot passes reducedMotion="user" through to MotionConfig without
// requiring framer-motion's full runtime in jsdom.
vi.mock('framer-motion', () => ({
  // LazyMotion defers feature loading; for the render-shape test it just needs
  // to pass children through (and expose that it received a `features` loader).
  LazyMotion: vi.fn(({features, children}) => (
    <div data-testid="lazy-motion" data-has-features={typeof features === 'function'}>
      {children}
    </div>
  )),
  MotionConfig: vi.fn(({reducedMotion, children}) => (
    <div data-testid="motion-config" data-reduced-motion={reducedMotion}>
      {children}
    </div>
  )),
}))

import {MotionRoot} from '../MotionRoot'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('MotionRoot — render shape', () => {
  it('renders children inside MotionConfig wrapper', () => {
    render(
      <MotionRoot>
        <p data-testid="child">child content</p>
      </MotionRoot>,
    )
    expect(screen.getByTestId('child').textContent).toBe('child content')
  })

  it('passes children through MotionConfig (children render inside the config wrapper)', () => {
    render(
      <MotionRoot>
        <p data-testid="child">child</p>
      </MotionRoot>,
    )
    const wrapper = screen.getByTestId('motion-config')
    expect(wrapper.contains(screen.getByTestId('child'))).toBe(true)
  })
})

// ─── reducedMotion contract ───────────────────────────────────────────────────
//
// MotionRoot's contract is to honor the user's prefers-reduced-motion OS
// setting. This is delivered by passing `reducedMotion="user"` to
// MotionConfig — Framer Motion then collapses animations to instant when
// the OS reports prefers-reduced-motion: reduce. CSS transitions are
// already handled by the global media query in globals.css.

describe('MotionRoot — reducedMotion contract', () => {
  it('passes reducedMotion="user" to MotionConfig', () => {
    render(
      <MotionRoot>
        <p>x</p>
      </MotionRoot>,
    )
    const wrapper = screen.getByTestId('motion-config')
    expect(wrapper.getAttribute('data-reduced-motion')).toBe('user')
  })
})

// ─── lazy feature-loading contract ──────────────────────────────────────────
//
// MotionRoot wraps the tree in <LazyMotion features={loader}> so Framer Motion's
// animation runtime loads on demand (first interaction) rather than during
// initial hydration. The header uses `m.*` components that bind to these
// async-loaded features. Regression net for the perf fix that took the runtime
// off the LCP critical path (platform perf QA).

describe('MotionRoot — lazy feature loading', () => {
  it('wraps children in LazyMotion with an async features loader', () => {
    render(
      <MotionRoot>
        <p data-testid="child">x</p>
      </MotionRoot>,
    )
    const lazy = screen.getByTestId('lazy-motion')
    expect(lazy.getAttribute('data-has-features')).toBe('true')
    // LazyMotion is the outer wrapper; MotionConfig nests inside it.
    expect(lazy.contains(screen.getByTestId('motion-config'))).toBe(true)
  })
})
