// ─── A card grid's columns follow its count (Phase 18 session B) ──────────────────────────────────────────────
//
// The attorney and testimonial grids were two, then three across whatever the count, so four attorneys or four
// reviews always left one card alone on the last row (the monorepo's Phase 18 ledger, 2026-09-30 F; Justin, of a
// throwaway: the four attorneys and four reviews each left one card alone). The columns now follow the count:
//
// - Up to the widest, every card sits on one row.
// - Past it, the count picks the columns that leave nobody alone. Upright cards: four where it divides the count,
//   else three where that does, else whichever of the two leaves a pair or more on the last row. Sideways cards and
//   quotes: three, and two by two for exactly four (a column of quotes five rows tall is not a fix), so ten or sixteen
//   of them leave one alone, centered.
// - A short last row is centered, at every width: so is a lone card no choice can avoid (13 upright cards,
//   7 quotes), and the odd card on a tablet's two columns.
//
// `widest` is the section's: 4 for a card that stands upright (a portrait, an avatar), 3 for one that lies
// sideways (Classic: its photo a third of the card, the name beside it) or holds a quote, so four of those go two
// by two rather than 300px apiece. A phone always stacks them.
//
// The grid has twice the columns it shows and each card spans two, so a short last row starts half a card in and
// every card keeps one column's width. Every class is written out whole, so Tailwind's scanner sees it.

export type CardTier = 'base' | 'sm' | 'lg'
type Across = 1 | 2 | 3 | 4
export type CardGridPlan = {across: Across; tiers: Record<CardTier, {columns: number; lastRow: number}>}

function acrossOf(count: number, widest: 3 | 4): Across {
  if (count <= widest) return Math.max(1, count) as Across
  if (widest === 3) return count === 4 ? 2 : 3
  if (count % 4 === 0) return 4
  if (count % 3 === 0) return 3
  if (count % 4 !== 1) return 4
  return count % 3 !== 1 ? 3 : 4
}

const COLUMNS: Record<Across, Record<CardTier, number>> = {
  1: {base: 1, sm: 1, lg: 1},
  2: {base: 1, sm: 2, lg: 2},
  3: {base: 1, sm: 2, lg: 3},
  4: {base: 1, sm: 2, lg: 4},
}

/** What the browser draws at each width for `count` cards: the columns, and how many cards the last row holds. */
export function cardGridPlan(count: number, widest: 3 | 4): CardGridPlan {
  const across = acrossOf(count, widest)
  const tier = (t: CardTier) => {
    const columns = COLUMNS[across][t]
    return {columns, lastRow: count % columns || Math.min(count, columns)}
  }
  return {across, tiers: {base: tier('base'), sm: tier('sm'), lg: tier('lg')}}
}

const LIST: Record<Across, string> = {
  1: 'grid grid-cols-1 gap-8 mx-auto w-full max-w-sm',
  2: 'grid grid-cols-1 gap-8 sm:grid-cols-4 lg:mx-auto lg:max-w-5xl',
  3: 'grid grid-cols-1 gap-8 sm:grid-cols-4 lg:grid-cols-6',
  4: 'grid grid-cols-1 gap-8 sm:grid-cols-4 lg:grid-cols-8',
}
const SPAN = 'sm:col-span-2'
// The first card of a short last row, by how many cards it is short (half a card per missing card).
const SM_START = 'sm:col-start-2'
const LG_START: Record<number, string> = {1: 'lg:col-start-2', 2: 'lg:col-start-3', 3: 'lg:col-start-4'}
const LG_RESET = 'lg:col-start-auto'

/** The list's classes, and one class string per card. */
export function cardGridClasses(count: number, widest: 3 | 4): {list: string; items: string[]} {
  const {across, tiers} = cardGridPlan(count, widest)
  const items: string[][] = Array.from({length: count}, () => (across === 1 ? [] : [SPAN]))
  const {sm, lg} = tiers
  const smFirst = sm.lastRow < sm.columns ? count - sm.lastRow : -1
  const lgFirst = lg.lastRow < lg.columns ? count - lg.lastRow : -1
  if (smFirst >= 0) items[smFirst].push(SM_START)
  if (lgFirst >= 0) items[lgFirst].push(LG_START[lg.columns - lg.lastRow])
  else if (smFirst >= 0 && lg.columns !== sm.columns) items[smFirst].push(LG_RESET)
  if (smFirst >= 0 && lgFirst >= 0 && smFirst !== lgFirst) items[smFirst].push(LG_RESET)
  return {list: LIST[across], items: items.map((c) => c.join(' '))}
}
