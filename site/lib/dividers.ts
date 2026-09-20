// ─── Section dividers (Phase 16C) ─────────────────────────────────────────────
//
// The shape where one homepage section meets the next, picked independently of the
// theme with a default from each theme (Justin, 2026-09-19: `[R-482]`, `[R-485]`),
// placed by one rule rather than section by section (`[R-481]`: under the hero and
// wherever the page enters a dark or saturated section), and carried into small
// places (`[R-483]`: card corners, button corners, a feature photo's corner, a mark
// above a heading on a dark ground).
//
// Every shape is DATA: the line between the two grounds, sampled left to right, with
// y from 0 (the top of the divider's strip) to 1 (its bottom). One function turns it
// into the two `polygon()`s the site paints, and the Studio's picker draws the same
// points, so there is one source. `polygon()` for every shape (Baseline since 2020):
// the arc and the wave are sampled curves, which avoids `shape()` (Baseline only since
// February 2026) and `path()` (pixels only; it cannot scale).
//
// The shape reaches the site as custom properties at `:root` (`buildDesignTokenCSS`):
// geometry, not color, so the `:root` alias trap of 16B amendment 9 does not apply.

type Point = readonly [x: string, y: number]

export const DIVIDERS = ['straight', 'angled', 'angledAlternating', 'arc', 'notch', 'arrow', 'wave', 'peak'] as const
export type Divider = (typeof DIVIDERS)[number]

/** What the carried pieces repeat, one per shape family (`[R-483]`). */
export const MOTIFS = ['slant', 'point', 'peak', 'round'] as const
export type Motif = (typeof MOTIFS)[number]

export type DividerShape = {
  label: string
  boundary: readonly Point[]
  /** `band`: scales with the viewport so the angle holds; `notch`: a small fixed V. */
  depth: 'band' | 'notch'
  /** Every second divider on the page is mirrored. */
  alternates?: true
  motif: Motif
}

const pct = (f: number) => `${+(f * 100).toFixed(3)}%`
const sample = (n: number, y: (t: number) => number): Point[] =>
  Array.from({length: n + 1}, (_, i) => [pct(i / n), +y(i / n).toFixed(4)] as const)

export const DIVIDER_SHAPES: Record<Exclude<Divider, 'straight'>, DividerShape> = {
  angled: {label: 'Angled', boundary: [['0%', 1], ['100%', 0]], depth: 'band', motif: 'slant'},
  angledAlternating: {label: 'Angled, alternating', boundary: [['0%', 1], ['100%', 0]], depth: 'band', alternates: true, motif: 'slant'},
  arc: {label: 'Shallow arc', boundary: sample(24, (t) => Math.sin(Math.PI * t)), depth: 'band', motif: 'round'},
  notch: {label: 'Notch', boundary: [['0%', 0], ['calc(50% - 1.25rem)', 0], ['50%', 1], ['calc(50% + 1.25rem)', 0], ['100%', 0]], depth: 'notch', motif: 'point'},
  arrow: {label: 'Arrow', boundary: [['0%', 0], ['50%', 1], ['100%', 0]], depth: 'band', motif: 'point'},
  wave: {label: 'Gentle wave', boundary: sample(48, (t) => 0.5 - 0.5 * Math.cos(2 * Math.PI * 2 * t)), depth: 'band', motif: 'round'},
  peak: {label: 'Peak', boundary: [['0%', 1], ['50%', 0], ['100%', 1]], depth: 'band', motif: 'peak'},
}

/** How deep a divider is. `band` holds a 2.5-degree angle from 390px to 1440px. */
export const DIVIDER_DEPTH = {band: 'clamp(1rem, 4.5vw, 4rem)', notch: '1.25rem'} as const

/** The region above the line (painted by a cut, in the upper band's ground) or below it (a rise, in the lower band's). */
export function dividerPolygon(shape: DividerShape, side: 'above' | 'below'): string {
  const b = shape.boundary.map(([x, y]) => `${x} ${pct(y)}`)
  const pts = side === 'above' ? ['0% 0%', '100% 0%', ...[...b].reverse()] : [...b, '100% 100%', '0% 100%']
  return `polygon(${pts.join(',')})`
}

export function dividerShape(value: string | null | undefined): DividerShape | null {
  return (DIVIDER_SHAPES as Record<string, DividerShape>)[value ?? ''] ?? null
}

// ─── The carried pieces (`[R-483]`) ───────────────────────────────────────────

export const CARRY_PIECES = ['cards', 'buttons', 'photo', 'mark'] as const
export type CarryPiece = (typeof CARRY_PIECES)[number]

const svg = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`

/** Per motif: the corner piece's clip (cards, buttons), the photo's corner, and the mark above a heading. */
export const MOTIF_PIECES: Record<Motif, {corner: string; photo: string; mark: string; markWidth: string}> = {
  slant: {
    corner: 'polygon(100% 0, 100% 100%, 0 100%)',
    photo: 'polygon(0 0, 100% 0, 100% calc(100% - 3rem), calc(100% - 3rem) 100%, 0 100%)',
    mark: svg(16, 12, "<polygon points='6,0 16,0 10,12 0,12'/>"),
    markWidth: '1rem',
  },
  point: {
    corner: 'polygon(100% 0, 100% 100%, 0 100%)',
    photo: 'polygon(0 0, 100% 0, 100% calc(100% - 3rem), calc(100% - 3rem) 100%, 0 100%)',
    mark: svg(14, 12, "<polygon points='0,0 14,0 7,12'/>"),
    markWidth: '0.875rem',
  },
  peak: {
    corner: 'polygon(100% 0, 100% 100%, 0 100%)',
    photo: 'polygon(0 0, 100% 0, 100% calc(100% - 3rem), calc(100% - 3rem) 100%, 0 100%)',
    mark: svg(14, 12, "<polygon points='7,0 14,12 0,12'/>"),
    markWidth: '0.875rem',
  },
  round: {
    corner: 'circle(100% at 100% 100%)',
    photo: 'inset(0 round var(--radius-ui) var(--radius-ui) 3rem var(--radius-ui))',
    mark: svg(12, 12, "<circle cx='6' cy='6' r='6'/>"),
    markWidth: '0.75rem',
  },
}

/** The stored pieces, read the way the site does: unknown values dropped. */
export function readCarry(value: unknown): CarryPiece[] {
  return Array.isArray(value) ? CARRY_PIECES.filter((p) => value.includes(p)) : []
}
