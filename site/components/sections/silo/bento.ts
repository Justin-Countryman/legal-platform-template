import type {SiloNavItem, SiloGridMode} from './types'

// ─── Bento layout resolution ────────────────────────────────────────────────────
// Every bento mode leads with the Primary item (first `featured`, else the first
// item) as a hero block top-left — so importance and left-to-right reading order
// agree. The hero is rendered FIRST in the DOM (reading/tab order leads with it).
//   • bentoLeft   — 2×2 hero, even field of 1×1 tiles around it
//   • bentoMosaic — 2×2 hero, remaining tiles varied (one tall, periodic wide) for
//                   editorial rhythm; dense flow packs around them
//   • bentoList   — hero card beside a scannable vertical list of the rest (its own
//                   composition, handled in SiloBento)

const BENTO_GRID =
  'grid grid-flow-dense grid-cols-1 gap-4 auto-rows-[13rem] @sm:grid-cols-2 @4xl:grid-cols-3 @4xl:auto-rows-[15rem]'

// The 2×2 hero, robust at every column count (tall on mobile, wide block at @sm+).
const HERO_SPAN = 'row-span-2 @sm:col-span-2'

export const BENTO_MODES: SiloGridMode[] = ['bentoLeft', 'bentoMosaic', 'bentoList']

export function isBentoMode(mode?: string | null): mode is SiloGridMode {
  return !!mode && (BENTO_MODES as string[]).includes(mode)
}

// Mosaic accents for the non-hero tiles: the first sits tall beside the hero, then a
// wide tile every third cell. Dense auto-flow fills the gaps, so this packs for any
// item count (bento's irregular tail is intentional).
export function mosaicCellSpan(index: number): string {
  if (index === 0) return '@sm:row-span-2'
  if (index % 3 === 2) return '@sm:col-span-2'
  return ''
}

export function bentoLayout(items: SiloNavItem[], mode: SiloGridMode) {
  const heroKey = items.find((i) => i.featured)?._key ?? items[0]?._key ?? null
  const hero = items.find((i) => i._key === heroKey) ?? null
  const rest = items.filter((i) => i._key !== heroKey)
  return {gridClass: BENTO_GRID, heroSpan: HERO_SPAN, mode, hero, rest}
}
