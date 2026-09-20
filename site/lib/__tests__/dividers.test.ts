import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {
  CARRY_PIECES, DIVIDERS, DIVIDER_DEPTH, DIVIDER_SHAPES, MOTIFS, MOTIF_PIECES, dividerPolygon, dividerShape, readCarry,
} from '../dividers'
import {dividerVars} from '../designTokens'

// The divider library (Phase 16C, `[R-482]`). Every shape is the line between two
// grounds, sampled left to right; one function turns it into the two polygons the site
// paints and the Studio's picker draws, so there is one source and nothing to drift.
//
// What these hold: the library equals what the Studio offers; every boundary runs the
// full width and stays inside the strip; the two polygons are complements, so a cut and
// a rise meet on the same line; the sampled curves are accurate enough that nobody can
// see the chords; and a straight or unknown shape emits nothing at all.

const fieldMap = JSON.parse(readFileSync(resolve(__dirname, '../../../studio/field-map.json'), 'utf8'))
const optionsOf = (field: string): string[] =>
  fieldMap.types.designSettings.fields.find((r: {path: string}) => r.path === field)?.options?.list ?? []

/** A boundary point's x as a fraction of the width, at a stated width in pixels. */
function xAt(x: string, width: number): number {
  if (!x.startsWith('calc')) return (parseFloat(x) / 100) * width
  const sign = x.includes('- 1.25rem') ? -1 : 1
  return width / 2 + sign * 20 // 1.25rem at the 16px root
}

describe('the divider library', () => {
  it('is what the Studio offers, and Straight is the absence of a shape', () => {
    expect([...DIVIDERS]).toEqual(optionsOf('sectionJoin'))
    expect(DIVIDERS[0]).toBe('straight')
    expect(Object.keys(DIVIDER_SHAPES).sort()).toEqual(DIVIDERS.filter((d) => d !== 'straight').sort())
    expect(dividerShape('straight')).toBeNull()
    expect(dividerShape('squiggle')).toBeNull()
    expect(dividerShape(null)).toBeNull()
  })

  it('holds the eight [R-482] names, and neither of the two Justin struck', () => {
    expect([...DIVIDERS]).toEqual(['straight', 'angled', 'angledAlternating', 'arc', 'notch', 'arrow', 'wave', 'peak'])
    expect(DIVIDERS).not.toContain('offset')
    expect(DIVIDERS).not.toContain('zigzag')
  })

  it.each(Object.entries(DIVIDER_SHAPES))('%s runs the full width and stays inside its strip', (id, shape) => {
    const xs = shape.boundary.map(([x]) => xAt(x, 1440))
    expect(xs[0], `${id} starts at the left edge`).toBe(0)
    expect(xs[xs.length - 1], `${id} ends at the right edge`).toBe(1440)
    // Monotonic left to right: a boundary that doubles back is not a boundary.
    for (let i = 1; i < xs.length; i++) expect(xs[i], `${id} point ${i}`).toBeGreaterThanOrEqual(xs[i - 1])
    for (const [, y] of shape.boundary) {
      expect(y, `${id} depth`).toBeGreaterThanOrEqual(0)
      expect(y, `${id} depth`).toBeLessThanOrEqual(1)
    }
    // Every shape reaches both the top and the bottom of the strip, or it is invisible.
    const ys = shape.boundary.map(([, y]) => y)
    expect(Math.max(...ys) - Math.min(...ys), `${id} is visible`).toBeGreaterThan(0.9)
  })

  it.each(Object.entries(DIVIDER_SHAPES))('%s draws two polygons that meet on the same line', (_, shape) => {
    const above = dividerPolygon(shape, 'above')
    const below = dividerPolygon(shape, 'below')
    expect(above.startsWith('polygon(0% 0%,100% 0%,')).toBe(true)
    expect(below.endsWith('100% 100%,0% 100%)')).toBe(true)
    // The boundary itself appears in both, once forwards and once backwards: a cut and a
    // rise at the same join meet on exactly the same line.
    const pct = (f: number) => `${+(f * 100).toFixed(3)}%`
    const line = shape.boundary.map(([x, y]) => `${x} ${pct(y)}`)
    for (const point of line) expect(above, point).toContain(point)
    expect(below.slice('polygon('.length).split(',').slice(0, line.length).join(',')).toBe(line.join(','))
    expect(above.slice('polygon(0% 0%,100% 0%,'.length).replace(/\)$/, '').split(',')).toEqual([...line].reverse())
  })

  it('samples the arc and the wave finely enough that the chords are invisible', () => {
    // A 24-point arc at 1440px: the deepest chord error is the sagitta of one segment.
    const depth = 64
    for (const [id, expected] of [['arc', 0.5], ['wave', 0.5]] as const) {
      const pts = DIVIDER_SHAPES[id].boundary.map(([x, y]) => [xAt(x, 1440), y * depth] as const)
      let worst = 0
      for (let i = 1; i < pts.length; i++) {
        const mid = (pts[i - 1][0] + pts[i][0]) / 2
        const chord = (pts[i - 1][1] + pts[i][1]) / 2
        const t = mid / 1440
        const curve = id === 'arc' ? Math.sin(Math.PI * t) * depth : (0.5 - 0.5 * Math.cos(4 * Math.PI * t)) * depth
        worst = Math.max(worst, Math.abs(curve - chord))
      }
      expect(worst, `${id} chord error in px`).toBeLessThan(expected)
    }
  })

  it('sizes the band shapes so the angle holds from a phone to a wide desktop', () => {
    // clamp(1rem, 4.5vw, 4rem): 17.55px at 390 and 64px at 1440 are both about 2.5°.
    expect(DIVIDER_DEPTH.band).toBe('clamp(1rem, 4.5vw, 4rem)')
    const angle = (w: number) => (Math.atan(Math.min(Math.max(16, 0.045 * w), 64) / w) * 180) / Math.PI
    expect(Math.abs(angle(390) - angle(1440))).toBeLessThan(0.2)
    // The notch is a fixed tab, not a slope, so it does not scale.
    expect(DIVIDER_DEPTH.notch).toBe('1.25rem')
    expect(DIVIDER_SHAPES.notch.depth).toBe('notch')
  })

  it('only the alternating shape carries state', () => {
    expect(Object.entries(DIVIDER_SHAPES).filter(([, s]) => s.alternates).map(([id]) => id)).toEqual(['angledAlternating'])
  })
})

describe('the carried pieces ([R-483])', () => {
  it('every shape names a motif, and every motif draws all four pieces', () => {
    for (const [id, shape] of Object.entries(DIVIDER_SHAPES)) expect(MOTIFS, id).toContain(shape.motif)
    for (const motif of MOTIFS) {
      const pieces = MOTIF_PIECES[motif]
      expect(pieces.corner, motif).toMatch(/^(polygon|circle)\(/)
      expect(pieces.photo, motif).toMatch(/^(polygon|inset)\(/)
      expect(pieces.mark, motif).toMatch(/^url\("data:image\/svg\+xml,/)
      expect(pieces.markWidth, motif).toMatch(/rem$/)
    }
  })

  it('reads the stored pieces the way the site does', () => {
    expect(readCarry(['cards', 'mark'])).toEqual(['cards', 'mark'])
    expect(readCarry(['cards', 'nonsense'])).toEqual(['cards'])
    // The order is the library's, not the document's, so two sites read the same.
    expect(readCarry(['mark', 'cards'])).toEqual(['cards', 'mark'])
    expect(readCarry(null)).toEqual([])
    expect(readCarry('cards')).toEqual([])
    expect([...CARRY_PIECES]).toEqual(['cards', 'buttons', 'photo', 'mark'])
  })

  it('the Studio offers exactly these pieces', () => {
    expect(optionsOf('dividerCarry').sort()).toEqual([...CARRY_PIECES].sort())
  })
})

describe('what the engine emits', () => {
  it('emits the shape, its depth and the motif for a shaped divider', () => {
    const css = dividerVars('peak')
    expect(css).toContain('--divider-above:polygon(')
    expect(css).toContain('--divider-below:polygon(')
    expect(css).toContain('--divider-depth:clamp(1rem, 4.5vw, 4rem)')
    expect(css).toContain('--carry-corner:')
    expect(css).toContain('--carry-photo:')
    expect(css).toContain('--carry-mark:')
  })

  it('emits nothing for straight, absent or unknown, so nothing is drawn', () => {
    for (const value of ['straight', '', null, undefined, 'nope']) expect(dividerVars(value)).toBe('')
  })

  it('the notch emits its own fixed depth', () => {
    expect(dividerVars('notch')).toContain('--divider-depth:1.25rem')
  })
})
