import {describe, expect, it} from 'vitest'
import {LOGO_SCALE, logoAspect, logoHeight} from '../logoSize'

// THE LOGO'S SIZE FOLLOWS ITS SHAPE (Phase 18 session B, item 3; monorepo `[R-603]`).
//
// Every desktop header drew every logo 80px tall, so a square mark over the firm's name got a quarter of a wordmark's
// area: Justin, of a throwaway, "the logo in the header should be bigger". Thirteen of his 48 great sites, measured at
// 1440 (ADV-18B-B): stacked logos draw 111 to 190px of ink, wide ones 61 to 99, and height times the square root of the
// aspect has a median of 175, which is roughly equal area. The rule: that constant, clamped, and never wider than the
// header's width cap.

describe('the logo’s height by its shape', () => {
  it('a wordmark four times as wide as tall keeps today’s 80px at rest; a square mark is drawn much taller', () => {
    expect(logoHeight(4, 'rest')).toBe(80)
    expect(logoHeight(1, 'rest')).toBeGreaterThanOrEqual(120)
    expect(logoHeight(1, 'rest')).toBeLessThanOrEqual(128)
  })

  it('draws roughly equal area across shapes, and never below the floor nor above the cap', () => {
    for (const a of [1, 1.2, 1.5, 1.73, 2, 2.5, 3, 4]) {
      const h = logoHeight(a, 'rest')
      expect(h, String(a)).toBeGreaterThanOrEqual(80)
      expect(h, String(a)).toBeLessThanOrEqual(128)
    }
    // Between the floor and the cap, height times the root of the aspect is the constant.
    expect(Math.round(logoHeight(1.73, 'rest') * Math.sqrt(1.73))).toBe(LOGO_SCALE.rest.k)
  })

  it('never draws wider than the header’s width cap: a long wordmark shrinks to fit it', () => {
    for (const size of ['rest', 'compact', 'phone', 'phoneSplit'] as const) {
      for (const a of [3, 5, 7, 10]) expect(logoHeight(a, size) * a, `${size} ${a}`).toBeLessThanOrEqual(LOGO_SCALE[size].maxWidth + 0.5)
    }
    expect(logoHeight(8, 'rest')).toBeCloseTo(352 / 8, 1)
  })

  it('the compact header and the phone draw a stacked logo larger than today’s 36 and 40px, within their rows', () => {
    expect(logoHeight(1, 'compact')).toBeGreaterThan(36)
    expect(logoHeight(1, 'compact')).toBeLessThanOrEqual(56)
    expect(logoHeight(4, 'compact')).toBe(36)
    expect(logoHeight(1, 'phone')).toBeGreaterThan(40)
    expect(logoHeight(1, 'phone')).toBeLessThanOrEqual(56)
    expect(logoHeight(4, 'phone')).toBe(40)
    expect(logoHeight(1, 'phoneSplit')).toBeLessThanOrEqual(44)
  })
})

describe('the logo’s shape is read after its trim', () => {
  it('the throwaway’s square file, its white margin trimmed, is 1.73 to 1', () => {
    const trim = {left: 0.041, top: 0.2373, width: 0.9132, height: 0.5323}
    expect(logoAspect({width: 438, height: 434, facts: {box: 'white', trim}})).toBeCloseTo(1.73, 2)
    expect(logoAspect({width: 438, height: 434})).toBeCloseTo(1.009, 2)
    expect(logoAspect({width: 0, height: 0})).toBe(4)
  })
})
