import {BUTTON_SHAPE_MAP, UI_RADIUS_MAP} from './designTokens'

// ─── Corner families (Phase 16A, [R-473]) ─────────────────────────────────────
//
// Cards, images, fields, panels and badges take `uiRadius`; buttons take
// `buttonShape`. They are two stored fields and stay two (every client stores both,
// and the build writes both), but they are CHOSEN as one family, the way a palette
// fills four colors: the Studio's Corners picker writes the pair, and the active
// family is matched by value, never stored (Justin, 2026-09-18).
//
// Why families: 59 of 65 homepages in the field study, and 11 of 11 premium ones,
// keep card and button corners in one family. Radix and shadcn derive the button's
// radius from the card's, so a button is never rounder than the card around it.
//
// The five, in stored values. Balanced is today's default pair.

export type CornerFamily = {
  id: 'sharp' | 'crisp' | 'balanced' | 'soft' | 'round'
  name: string
  uiRadius: keyof typeof UI_RADIUS_MAP
  buttonShape: keyof typeof BUTTON_SHAPE_MAP
  /** A few words for the Studio. */
  feel: string
}

export const CORNER_FAMILIES: readonly CornerFamily[] = [
  {id: 'sharp',    name: 'Sharp',    uiRadius: 'sharp',   buttonShape: 'square',  feel: 'square cards, square buttons'},
  {id: 'crisp',    name: 'Crisp',    uiRadius: 'subtle',  buttonShape: 'square',  feel: 'barely rounded cards, square buttons'},
  {id: 'balanced', name: 'Balanced', uiRadius: 'rounded', buttonShape: 'rounded', feel: 'rounded cards, slightly rounded buttons'},
  {id: 'soft',     name: 'Soft',     uiRadius: 'soft',    buttonShape: 'stadium', feel: 'soft cards, rounded buttons'},
  {id: 'round',    name: 'Round',    uiRadius: 'soft',    buttonShape: 'pill',    feel: 'soft cards, pill buttons'},
]

/** The default pair, what an absent field renders (`buildDesignTokenCSS`). */
export const DEFAULT_CORNERS = {uiRadius: 'rounded', buttonShape: 'rounded'} as const

const px = (value: string) => (value === '9999px' ? Infinity : parseFloat(value))

/** The family a stored pair belongs to, or null. Absent values read as the defaults. */
export function matchCornerFamily(uiRadius?: string | null, buttonShape?: string | null): CornerFamily | null {
  const ui = uiRadius ?? DEFAULT_CORNERS.uiRadius
  const btn = buttonShape ?? DEFAULT_CORNERS.buttonShape
  return CORNER_FAMILIES.find((f) => f.uiRadius === ui && f.buttonShape === btn) ?? null
}

/** A mismatch, by rule rather than by list: the button is rounder than the card,
 *  unless it is a pill (a pill is its own shape and reads with any card). */
export function cornersMismatch(uiRadius?: string | null, buttonShape?: string | null): boolean {
  const btn = buttonShape ?? DEFAULT_CORNERS.buttonShape
  if (btn === 'pill') return false
  const card = UI_RADIUS_MAP[uiRadius ?? DEFAULT_CORNERS.uiRadius] ?? UI_RADIUS_MAP.rounded
  const button = BUTTON_SHAPE_MAP[btn] ?? BUTTON_SHAPE_MAP.rounded
  return px(button) > px(card)
}
