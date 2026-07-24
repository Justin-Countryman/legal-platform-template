import {describe, it, expect} from 'vitest'
import {renderHook} from '@testing-library/react'
import {MotionConfig} from 'framer-motion'
import {motionConfig, useMotionConfig} from '../motionConfig'

// Item 38 ruling: under reduced motion, framer's positional keys are snapped
// by MotionConfig reducedMotion="user" at the root; every NON-positional
// framer transition must come from useMotionConfig(), which collapses all
// durations to the platform's 10ms reduced tempo (the same doctrine the
// global CSS media rule applies to CSS transitions/animations).
//
// `MotionConfig reducedMotion="always"` drives framer's useReducedMotion()
// to true regardless of the environment's matchMedia — which is exactly the
// production signal path (the hook subscribes to the same context), so the
// test exercises the real gate rather than a mock.

const reducedWrapper = ({children}: {children: React.ReactNode}) => (
  <MotionConfig reducedMotion="always">{children}</MotionConfig>
)

describe('useMotionConfig — reduced-motion collapse (item 38)', () => {
  it('returns the canonical configs untouched when motion is not reduced', () => {
    const {result} = renderHook(() => useMotionConfig())
    expect(result.current).toBe(motionConfig)
    expect(result.current.crossfade.duration).toBe(0.15)
    expect(result.current.drawer.duration).toBe(0.4)
  })

  it('collapses EVERY duration to 10ms under reduced motion — no key exempted', () => {
    const {result} = renderHook(() => useMotionConfig(), {wrapper: reducedWrapper})
    const keys = Object.keys(motionConfig) as (keyof typeof motionConfig)[]
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(result.current[key].duration, `${key} must collapse to the 10ms reduced tempo`).toBe(0.01)
    }
  })

  it('reduced set covers exactly the canonical keys (a new config cannot silently skip reduction)', () => {
    const {result} = renderHook(() => useMotionConfig(), {wrapper: reducedWrapper})
    expect(Object.keys(result.current).sort()).toEqual(Object.keys(motionConfig).sort())
  })
})
