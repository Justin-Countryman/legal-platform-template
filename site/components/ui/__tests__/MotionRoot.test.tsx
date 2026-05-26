import {describe, it, expect, vi} from 'vitest'
import {render, screen} from '@testing-library/react'

// Mock framer-motion to capture the MotionConfig invocation; verifies
// MotionRoot passes reducedMotion="user" through to MotionConfig without
// requiring framer-motion's full runtime in jsdom.
vi.mock('framer-motion', () => ({
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
