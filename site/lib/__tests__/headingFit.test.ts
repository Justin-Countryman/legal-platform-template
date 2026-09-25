import {describe, expect, it} from 'vitest'
import ADVANCES from '../../fonts/heading-advances.json'
import {FONT_PRESETS, headingWeights} from '../../fonts/presets'
import {headingFaceOf, type HeadingFace} from '../headingFace'
import {headingFit} from '../headingFit'

// Phase 17C session 3 (`[R-536]`, `[R-544]`; monorepo WS-V1-PHASE17C3-DESIGN §2.1): the widths a
// section heading carries, from the face's own character advances, wrapped as the browser wraps.

const TABLE = ADVANCES.pairings as unknown as Record<string, Record<string, number[]>>
const adv = (face: HeadingFace, s: string) => [...s].reduce((a, ch) => a + TABLE[String(face.pairing)][face.weight][ch.charCodeAt(0) - 32], 0)
const GRAPHITE: HeadingFace = {pairing: 4, weight: '700', upper: false}

describe('fonts/heading-advances.json', () => {
  it('holds every pairing heading at every weight it can draw, 95 characters each', () => {
    for (const p of FONT_PRESETS) {
      for (const w of headingWeights(p)) {
        const row = TABLE[String(p.id)]?.[w]
        expect(row, `pairing ${p.id} at ${w}`).toHaveLength(95)
        // A space is narrower than an M in every face; nothing is zero or wider than 1.5 em.
        expect(row![0]).toBeLessThan(row!['M'.charCodeAt(0) - 32])
        for (const v of row!) expect(v > 0 && v < 1.5).toBe(true)
      }
    }
    expect(Object.keys(TABLE).sort()).toEqual(FONT_PRESETS.map((p) => String(p.id)).sort())
  })
})

describe('headingFaceOf', () => {
  it('reads the pairing, the weight a section heading draws in it, and the case', () => {
    expect(headingFaceOf({fontPairingPreset: 4})).toEqual({pairing: 4, weight: '700', upper: false})
    expect(headingFaceOf({fontPairingPreset: 1, headingWeight: 'regular', headingCase: 'upper'})).toEqual({pairing: 1, weight: '400', upper: true})
    // Iron: Oswald's one weight is 500, under the 600 that reads as bold, so it draws 500.
    expect(headingFaceOf({fontPairingPreset: 19, headingCase: 'upper'})).toEqual({pairing: 19, weight: '500', upper: true})
    // Birch: light draws 300 only from 32 px; the width is read at the wider 400.
    expect(headingFaceOf({fontPairingPreset: 20, headingWeight: 'light'})).toEqual({pairing: 20, weight: '400', upper: false})
    // A variable span that stops at 600 clamps `font-bold` there.
    expect(headingFaceOf({fontPairingPreset: 18})).toEqual({pairing: 18, weight: '600', upper: false})
  })
  it('keeps the case with no pairing (an upload, or nothing)', () => {
    expect(headingFaceOf({headingCase: 'upper'})).toEqual({pairing: null, weight: '', upper: true})
    expect(headingFaceOf(null)).toEqual({pairing: null, weight: '', upper: false})
  })
})

describe('headingFit', () => {
  it('is null for an empty heading, so it renders as today', () => {
    expect(headingFit('', GRAPHITE)).toBeNull()
    expect(headingFit('   ', GRAPHITE)).toBeNull()
    expect(headingFit(null, GRAPHITE)).toBeNull()
  })

  it('is the narrowest line greedy wrapping fits in three lines and in four', () => {
    // Four equal words: three lines need two words on the first line; four need one a line.
    const word = 'bold'
    const text = [word, word, word, word].join(' ')
    const w = adv(GRAPHITE, word)
    const s = adv(GRAPHITE, ' ')
    const fit = headingFit(text, GRAPHITE)!
    expect(fit.w3).toBeCloseTo(Math.ceil((2 * w + s) * 100) / 100, 2)
    expect(fit.w4).toBeCloseTo(Math.ceil(w * 100) / 100, 2)
  })

  it('never goes under the widest word, which the browser will not break', () => {
    const fit = headingFit('Representation is here', GRAPHITE)!
    expect(fit.w4).toBeGreaterThanOrEqual(adv(GRAPHITE, 'Representation') - 0.005)
    expect(fit.w3).toBeGreaterThanOrEqual(fit.w4)
  })

  it('breaks after a hyphen, as the browser does', () => {
    const joined = headingFit('Well-known local counsel', GRAPHITE)!
    const spaced = headingFit('Wellknown local counsel', GRAPHITE)!
    expect(joined.w4).toBeLessThan(spaced.w4)
    expect(joined.w4).toBeGreaterThanOrEqual(adv(GRAPHITE, 'counsel') - 0.005)
  })

  it('reads capitals wider, with the tracking every capital carries', () => {
    const upper: HeadingFace = {pairing: 7, weight: '700', upper: true}
    const mixed: HeadingFace = {pairing: 7, weight: '700', upper: false}
    const text = 'Why work with us'
    const u = headingFit(text, upper)!
    const m = headingFit(text, mixed)!
    expect(u.w3).toBeGreaterThan(m.w3)
    // One word a line at four: the widest word in capitals, each character tracked 0.06 em.
    expect(u.w4).toBeCloseTo(Math.ceil((adv(upper, 'WORK') + 0.06 * 4) * 100) / 100, 2)
  })

  it('fits an upload or an unknown pairing as the widest shipped face, so it shrinks early, never late', () => {
    const text = 'A practice built on answers, not guesswork'
    const widest = headingFit(text, {pairing: null, weight: '', upper: false})!
    for (const p of FONT_PRESETS) {
      for (const w of headingWeights(p)) {
        const f = headingFit(text, {pairing: p.id, weight: w, upper: false})!
        expect(widest.w3, `pairing ${p.id} at ${w}`).toBeGreaterThanOrEqual(f.w3 - 0.01)
      }
    }
    expect(headingFit(text, {pairing: 99, weight: '700', upper: false})).toEqual(widest)
  })

  it('reads a character outside printable ASCII as the face\'s widest letter', () => {
    const plain = headingFit('Cafe law', GRAPHITE)!
    const accented = headingFit('Café law', GRAPHITE)!
    expect(accented.w4).toBeGreaterThan(plain.w4)
  })
})
