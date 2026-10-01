import type {LogoFacts} from './logoFacts'

// ─── The logo's size follows its shape (Phase 18 session B, item 3; monorepo `[R-603]`) ─────────────────────────────
//
// Every desktop header drew every logo 80px tall (36px compacted, 36 to 40 on a phone), so a square mark over the
// firm's name got a quarter of a wordmark's area; Justin, of a throwaway: "the logo in the header should be bigger".
// Thirteen of his 48 great sites, measured at 1440 (ADV-18B-B): stacked logos draw 111 to 190px of ink, wide ones 61 to
// 99, and height times the square root of the aspect has a median of 175, roughly equal area. So the height is `k` over
// the root of the logo's aspect (read after its trim, `logoFacts`), clamped to each place's floor and ceiling, and never
// wider than the header draws a logo today. The floors are today's heights, so no wordmark shrinks. `k` at rest is the
// value Justin's eye picks between 150 and 175 (the three sizes shown to him); 160 until then.
//
// The ceilings keep each row's own box: 128px at rest (the header grows around it; the merged header's 8rem reserve,
// which applies only where a site stores the merge, is the page's to refine after hydration), 56px compacted and in the
// phone rows (the collapsible row's `max-h-20` less its padding), 44px in the phone's split rows.

export type LogoSize = 'rest' | 'compact' | 'phone' | 'phoneSplit'

export const LOGO_SCALE: Record<LogoSize, {k: number; min: number; max: number; maxWidth: number}> = {
  rest: {k: 160, min: 80, max: 128, maxWidth: 352},
  compact: {k: 72, min: 36, max: 56, maxWidth: 352},
  phone: {k: 80, min: 40, max: 56, maxWidth: 224},
  phoneSplit: {k: 72, min: 36, max: 44, maxWidth: 224},
}

/** The drawn height in pixels of a logo of this aspect (width over height) in this place. */
export function logoHeight(aspect: number, size: LogoSize): number {
  const s = LOGO_SCALE[size]
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : 4
  return Math.min(s.max, Math.max(s.min, s.k / Math.sqrt(a)), s.maxWidth / a)
}

/** A logo's aspect as drawn: its trimmed rectangle's where it has one, else its file's; a wordmark's where unknown. */
export function logoAspect(logo: {width?: number | null; height?: number | null; facts?: LogoFacts | null}): number {
  const w = logo.width ?? 0
  const h = logo.height ?? 0
  if (!(w > 0 && h > 0)) return 4
  const t = logo.facts?.trim
  return t ? (w * t.width) / (h * t.height) : w / h
}
