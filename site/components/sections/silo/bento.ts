import type {SiloNavItem, SiloGridMode} from './types'

// ─── Bento layout resolution ────────────────────────────────────────────────────
// Every bento mode leads with the Primary item (first `featured`, else the first
// item) as a hero block top-left — so importance and left-to-right reading order
// agree. The hero is rendered FIRST in the DOM (reading/tab order leads with it).
//   • bentoLeft   — 2×2 hero, even field of 1×1 tiles around it
//   • bentoMosaic — 2×2 hero, remaining tiles varied (one tall beside the hero, then
//                   wide and narrow rows alternating) for editorial rhythm
//   • bentoList   — hero card beside a scannable vertical list of the rest (its own
//                   composition, handled in SiloBento)

// No `grid-flow-dense`: tiles keep reading order, and the spans below are chosen so
// every row fills anyway (Phase 16A: with dense flow and fixed spans, most counts
// left empty cells at two and three columns, which Justin saw in the catalog).
const BENTO_GRID =
  'grid grid-cols-1 gap-4 auto-rows-[13rem] @sm:grid-cols-2 @4xl:grid-cols-3 @4xl:auto-rows-[15rem]'

// The 2×2 hero, robust at every column count (tall on mobile, wide block at @sm+).
const HERO_SPAN = 'row-span-2 @sm:col-span-2'
// A hero with nothing beside it takes the whole row at three columns.
const HERO_ALONE = 'row-span-2 @sm:col-span-2 @4xl:col-span-3'

export const BENTO_MODES: SiloGridMode[] = ['bentoLeft', 'bentoMosaic', 'bentoList']

export function isBentoMode(mode?: string | null): mode is SiloGridMode {
  return !!mode && (BENTO_MODES as string[]).includes(mode)
}

// Every span a bento tile can take, written out so Tailwind finds each class.
// Two columns (@sm) and three (@4xl) each get their own span; a three-column span
// is always stated, so a two-column one never leaks upward.
const SPAN = {
  sm: {1: '', 2: '@sm:col-span-2'},
  xl: {1: '@4xl:col-span-1', 2: '@4xl:col-span-2', 3: '@4xl:col-span-3'},
  tall: '@4xl:row-span-2',
} as const

type Cell = {sm: 1 | 2; xl: 1 | 2 | 3; tall?: boolean}

/** Row sizes for `k` tiles in a three-column field, mixing two-tile rows (one wide,
 *  one narrow) and three-tile rows, alternating where the count allows, never
 *  leaving a row of one unless `k` is one. */
function mixedRows(k: number): number[] {
  const rows: number[] = []
  let rem = k
  let want = 2
  while (rem > 0) {
    if (rem === 1 || rem === 2 || rem === 3) { rows.push(rem); break }
    if (rem === 4) { rows.push(2, 2); break }
    let take = want
    if (rem - take === 1) take = take === 2 ? 3 : 2
    rows.push(take)
    rem -= take
    want = take === 2 ? 3 : 2
  }
  return rows
}

/** The span of each non-hero tile, in reading order, so that every row fills at one,
 *  two and three columns for any count (proven for 1 to 12 in `bento.test.ts`). */
export function bentoCells(restCount: number, mode: SiloGridMode): Cell[] {
  const cells: Cell[] = Array.from({length: restCount}, () => ({sm: 1, xl: 1}))
  if (restCount === 0) return cells

  // Two columns: the hero fills two rows edge to edge, the rest pair up; an odd
  // tile goes wide, first on the mosaic (for rhythm), last on the even field.
  if (restCount % 2 === 1) cells[mode === 'bentoMosaic' ? 0 : restCount - 1].sm = 2

  // Three columns: the hero is 2×2, so column three beside it takes one tall tile
  // (the mosaic, or a lone tile) or two ordinary ones; the rows below then fill.
  const tallBeside = mode === 'bentoMosaic' || restCount === 1
  const beside = tallBeside ? 1 : 2
  if (tallBeside) cells[0].tall = true
  const below = cells.slice(beside)
  if (mode === 'bentoMosaic') {
    let i = 0
    let wideFirst = true
    for (const size of mixedRows(below.length)) {
      if (size === 1) below[i].xl = 3
      if (size === 2) { below[wideFirst ? i : i + 1].xl = 2; wideFirst = !wideFirst }
      i += size
    }
  } else {
    const r = below.length % 3
    if (r === 1) below[below.length - 1].xl = 3
    if (r === 2) below[below.length - 1].xl = 2
  }
  return cells
}

export function cellClass(cell: Cell): string {
  return [SPAN.sm[cell.sm], SPAN.xl[cell.xl], cell.tall ? SPAN.tall : ''].filter(Boolean).join(' ')
}

export function bentoLayout(items: SiloNavItem[], mode: SiloGridMode) {
  const heroKey = items.find((i) => i.featured)?._key ?? items[0]?._key ?? null
  const hero = items.find((i) => i._key === heroKey) ?? null
  const rest = items.filter((i) => i._key !== heroKey)
  const cells = bentoCells(rest.length, mode)
  return {gridClass: BENTO_GRID, heroSpan: rest.length === 0 ? HERO_ALONE : HERO_SPAN, mode, hero, rest, cellClasses: cells.map(cellClass)}
}

/** Every class the grid can emit, for the test that resolves them through Tailwind. */
export const ALL_BENTO_CLASSES: readonly string[] = [BENTO_GRID, HERO_SPAN, HERO_ALONE, SPAN.sm[2], ...Object.values(SPAN.xl), SPAN.tall]
  .join(' ')
  .split(/\s+/)
  .filter(Boolean)
