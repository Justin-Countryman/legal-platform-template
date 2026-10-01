// ─── The other grids follow their count (Phase 18 session D) ────────────────────────────────────────────────────
//
// Session B made the attorney and testimonial cards follow their count (`cardGrid.ts`). The grids the build writes beside
// them did not: the practice areas drew three across and their rows two across whatever the count, so four, five, seven
// or eight areas left a short row packed left; a content section's items drew two across, so the firm-data path's three
// differentiators always left one alone; case results drew three across. On the study's rated law sites a short last
// row is close to absent (3 of 49 pages; monorepo WS-DESIGN-ENGINE-GAPS-DESIGN.md §16.3 row 1).
//
// The same rule as session B's, at any set of tiers, viewport (`sm:`) or container (`@xl:`, `@4xl:`, `@6xl:`, the
// practice areas' own nav, which an `aside` header narrows):
// - Up to a tier's widest, every item sits on one row.
// - Past it, the widest or one fewer: the first that divides the count, else the first that leaves a pair or more on
//   the last row, else the widest (one alone, which no choice avoids, centred).
// - A short last row is centred at every tier: the grid has twice the columns it shows and each item spans two, so a
//   short row starts half an item in per item missing.
//
// Every class is written out whole in `COUNT_GRID_CLASSES`, so Tailwind's scanner sees it, and the test resolves each
// through Tailwind's own design system.

export type GridTier = {prefix: 'sm' | 'lg' | '@xl' | '@4xl' | '@6xl'; widest: number}
export type TierPlan = {prefix: GridTier['prefix']; columns: number; lastRow: number}

/** The practice areas' cards: two across from a 36rem nav, three from 56rem, four from 72rem (a full band at 1280). */
export const AREA_CARD_TIERS: readonly GridTier[] = [{prefix: '@xl', widest: 2}, {prefix: '@4xl', widest: 3}, {prefix: '@6xl', widest: 4}]
/** Split area cards lie sideways (a photo panel beside the text), so at most three across, as session B's sideways cards. */
export const AREA_SIDEWAYS_TIERS: readonly GridTier[] = [{prefix: '@xl', widest: 2}, {prefix: '@4xl', widest: 3}, {prefix: '@6xl', widest: 3}]
/** One or two items keep the width they had in a fixed grid (the pre-report break pass): one area card a third of the band,
 *  two of them two thirds, one row half; one case result a third. Never one card across the whole band. */
export const NARROW_FEW: Readonly<Partial<Record<number, string>>> = {1: 'mx-auto w-full max-w-sm', 2: 'mx-auto w-full max-w-3xl'}
export const NARROW_ONE_ROW: Readonly<Partial<Record<number, string>>> = {1: 'mx-auto w-full max-w-xl'}
/** The practice areas' bordered rows (`inline`): two across from a 36rem nav. */
export const AREA_ROW_TIERS: readonly GridTier[] = [{prefix: '@xl', widest: 2}]
/** Case results: a result card lies sideways (its figure, then its type and caption), so two across from `sm` and
 *  three from `lg`, and four two by two, as session B's sideways cards. */
export const CASE_RESULT_TIERS: readonly GridTier[] = [{prefix: 'sm', widest: 2}, {prefix: 'lg', widest: 3}]
/** A content section's items, in a column beside or under the heading: one per row at three (three across a half
 *  column is a cramped line of cards), else two across from `sm`. */
export function itemTiers(count: number): readonly GridTier[] {
  return [{prefix: 'sm', widest: count === 3 ? 1 : 2}]
}

/** The columns a tier draws `count` items in: all on one row up to `widest`; past it the widest or one fewer, the first
 *  that divides the count, else the first that leaves a pair or more on the last row, else the widest (session B's rule,
 *  `cardGrid.ts`, for any widest; never fewer than one under it, so four across never falls to two). */
export function columnsFor(count: number, widest: number): number {
  if (count <= widest) return Math.max(1, count)
  const choices = [widest, widest - 1].filter((c) => c >= 2)
  return choices.find((c) => count % c === 0) ?? choices.find((c) => count % c !== 1) ?? widest
}

export function countGridPlan(count: number, tiers: readonly GridTier[]): TierPlan[] {
  return tiers.map(({prefix, widest}) => {
    const columns = columnsFor(count, widest)
    return {prefix, columns, lastRow: count % columns || Math.min(count, columns)}
  })
}

/** Every class the plan can write, written out whole. */
export const COUNT_GRID_CLASSES: readonly string[] = [
  'grid', 'grid-cols-1', 'mx-auto', 'w-full', 'max-w-sm', 'max-w-xl', 'max-w-3xl',
  'sm:grid-cols-2', 'sm:grid-cols-4', 'sm:grid-cols-6', 'sm:grid-cols-8', 'sm:col-span-2',
  'sm:col-start-2', 'sm:col-start-3', 'sm:col-start-4', 'sm:col-start-auto',
  'lg:grid-cols-2', 'lg:grid-cols-4', 'lg:grid-cols-6', 'lg:grid-cols-8', 'lg:col-span-2',
  'lg:col-start-2', 'lg:col-start-3', 'lg:col-start-4', 'lg:col-start-auto',
  '@xl:grid-cols-2', '@xl:grid-cols-4', '@xl:grid-cols-6', '@xl:grid-cols-8', '@xl:col-span-2',
  '@xl:col-start-2', '@xl:col-start-3', '@xl:col-start-4', '@xl:col-start-auto',
  '@4xl:grid-cols-2', '@4xl:grid-cols-4', '@4xl:grid-cols-6', '@4xl:grid-cols-8', '@4xl:col-span-2',
  '@4xl:col-start-2', '@4xl:col-start-3', '@4xl:col-start-4', '@4xl:col-start-auto',
  '@6xl:grid-cols-2', '@6xl:grid-cols-4', '@6xl:grid-cols-6', '@6xl:grid-cols-8', '@6xl:col-span-2',
  '@6xl:col-start-2', '@6xl:col-start-3', '@6xl:col-start-4', '@6xl:col-start-auto',
]
const cls = (prefix: string, rest: string) => {
  const c = `${prefix}:${rest}`
  if (!COUNT_GRID_CLASSES.includes(c)) throw new Error(`countGrid: ${c} is not written out in COUNT_GRID_CLASSES`)
  return c
}

/** The list's grid classes (without its gap), and one class string per item; `narrow` caps the list's width at a count. */
export function countGridClasses(count: number, tiers: readonly GridTier[], narrow: Readonly<Partial<Record<number, string>>> = {}): {list: string; items: string[]} {
  const plan = countGridPlan(count, tiers)
  const list = ['grid', 'grid-cols-1', ...plan.map((t) => cls(t.prefix, `grid-cols-${t.columns * 2}`)), ...(narrow[count] ? [narrow[count]!] : [])]
  const items: string[][] = Array.from({length: count}, () => plan.map((t) => cls(t.prefix, 'col-span-2')))
  const last: string[] = Array.from({length: count}, () => 'auto')
  for (const t of plan) {
    const first = t.lastRow < t.columns ? count - t.lastRow : -1
    for (let i = 0; i < count; i++) {
      const want = i === first ? String(t.columns - t.lastRow + 1) : 'auto'
      if (want !== last[i]) items[i].push(cls(t.prefix, `col-start-${want}`))
      last[i] = want
    }
  }
  return {list: list.join(' '), items: items.map((c) => c.join(' '))}
}
