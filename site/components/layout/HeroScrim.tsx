// Shared hero legibility scrim — one implementation for every full-bleed hero
// background under white text (the internal-hero backdrop, the homepage Overlay
// backdrop, and the homepage Section Background on a dark band). Keeping it here
// means the flat/gradient logic can never drift between those call sites.
//
//   • style 'flat'     — even overlay at `opacity` (the legacy backdrop scrim).
//   • style 'gradient' — the stored strength on the text side, deepening from the
//                        floor toward it; horizontal for left content, bottom-up for
//                        centered. It never fades below the floor (monorepo backlog 321).
//
// A light band draws no scrim: its photo is the ghost (HeroBackdrop, monorepo backlog
// 321). The opacity is baked into the gradient stops via color-mix, so the gradient
// variant needs no separate opacity layer.

export type HeroScrimStyle = 'flat' | 'gradient'
export type HeroScrimAlign = 'left' | 'center'
// Gradient-only overrides (the flat overlay is always the scrim color). 'auto' keeps
// the derived behavior: the scrim color, direction from content align.
export type HeroScrimColor = 'auto' | 'action' | 'black'
export type HeroScrimDirection =
  | 'auto'
  | 'to-right'
  | 'to-left'
  | 'to-top'
  | 'to-bottom'
  | 'to-top-right'
  | 'to-top-left'
  | 'to-bottom-right'
  | 'to-bottom-left'

// A hero sets its heading and body text on this scrim. Over the lightest possible
// photo pixel (white), every dark-surface text tier reaches WCAG 2.2 AA only when
// the scrim is --color-scrim (the dark ground capped at L 0.20) at 80% or more
// (Phase 14, WS-V1-PHASE14-DESIGN §7 amendment 21). So a dark scrim never renders
// weaker than that; the operator's stored opacity is untouched and still deepens
// it above 80.
export const MIN_TEXT_SCRIM_OPACITY = 80
// No point of the scrim is lighter than the floor: a gradient deepens from the floor
// toward the stored opacity, never fades below it, and the action color, a brand
// color of any lightness, never sits under text (monorepo `[R-462]`, backlog 321).
// Editor-chosen gradient base color. 'black' is a palette-independent neutral darken,
// darker than the dark scrim at every opacity, so it holds wherever the scrim does.
// 'auto' and a stored 'action' (retired, `[R-462]`) draw the scrim color.
const COLOR_BASE: Record<'black', string> = {
  black: '#000000',
}
const DIR_CSS: Record<Exclude<HeroScrimDirection, 'auto'>, string> = {
  'to-right': 'to right',
  'to-left': 'to left',
  'to-top': 'to top',
  'to-bottom': 'to bottom',
  'to-top-right': 'to top right',
  'to-top-left': 'to top left',
  'to-bottom-right': 'to bottom right',
  'to-bottom-left': 'to bottom left',
}

export function HeroScrim({
  style = 'flat',
  opacity,
  align = 'left',
  color = 'auto',
  direction = 'auto',
  textRight = false,
}: {
  style?: HeroScrimStyle
  opacity: number
  align?: HeroScrimAlign
  // Gradient-only: the fade color and direction. 'auto' preserves the derived
  // behavior (the scrim color, alignment-based direction).
  /** The text sits on the right (the hero's figure on the left, monorepo `[R-641]`): the auto gradient darkens there. */
  textRight?: boolean
  color?: HeroScrimColor
  direction?: HeroScrimDirection
}) {
  const effective = Math.max(opacity, MIN_TEXT_SCRIM_OPACITY)
  if (style !== 'gradient') {
    return <div className="absolute inset-0 bg-scrim" style={{opacity: effective / 100}} data-testid="hero-scrim" />
  }
  const base = color === 'black' ? COLOR_BASE.black : 'var(--color-scrim)'
  const strong = `color-mix(in srgb, ${base} ${effective}%, transparent)`
  const weak = `color-mix(in srgb, ${base} ${MIN_TEXT_SCRIM_OPACITY}%, transparent)`
  const dir = direction !== 'auto' ? DIR_CSS[direction] : align === 'center' ? 'to top' : textRight ? 'to left' : 'to right'
  return (
    <div
      className="absolute inset-0"
      style={{backgroundImage: `linear-gradient(${dir}, ${strong}, ${weak})`}}
      data-testid="hero-scrim"
    />
  )
}
