// Shared hero legibility scrim — one implementation for every full-bleed hero
// background (the internal-hero backdrop, the homepage Overlay backdrop, and the
// homepage Section Background). Keeping it here means the flat/gradient + dark/
// light tone logic can never drift between those call sites.
//
//   • style 'flat'     — even overlay at `opacity` (the legacy backdrop scrim).
//   • style 'gradient' — the stored strength on the text side, deepening from the
//                        floor toward it; horizontal for left content, bottom-up for
//                        centered. It never fades below the floor (monorepo backlog 321).
//   • tone  'dark'     — brand-dark overlay → white text (photo / dark band).
//   • tone  'light'    — page-background overlay → dark text (subtle light pattern).
//
// The opacity is baked into the gradient stops via color-mix, so the gradient
// variant needs no separate opacity layer.

export type HeroScrimStyle = 'flat' | 'gradient'
export type HeroScrimTone = 'dark' | 'light'
export type HeroScrimAlign = 'left' | 'center'
// Gradient-only overrides (the flat overlay always follows the tone). 'auto' keeps
// the legacy derived behavior: color from the tone, direction from content align.
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

const TONE_VAR: Record<HeroScrimTone, string> = {
  dark: '--color-scrim',
  light: '--color-background',
}
const TONE_BG: Record<HeroScrimTone, string> = {
  dark: 'bg-scrim',
  light: 'bg-background',
}

// A hero sets its heading and body text on this scrim. Over the lightest possible
// photo pixel (white), every dark-surface text tier reaches WCAG 2.2 AA only when
// the scrim is --color-scrim (the dark ground capped at L 0.20) at 80% or more
// (Phase 14, WS-V1-PHASE14-DESIGN §7 amendment 21). So a dark scrim never renders
// weaker than that; the operator's stored opacity is untouched and still deepens
// it above 80.
export const MIN_TEXT_SCRIM_OPACITY = 80
// On a light band the scrim is the page background, and the worst photo pixel is
// black: every light text tier, the action text and the accent text reach 4.5:1
// only at 97% (swept in colorGuarantee.test.ts), so a light band's image draws at
// about the strength of the site's own light texture (monorepo backlog 321).
export const MIN_LIGHT_SCRIM_OPACITY = 97
// No point of a scrim is lighter than its tone's floor: a gradient deepens from the
// floor toward the stored opacity, never fades below it, and the action color, a
// brand color of any lightness, never sits under text (monorepo `[R-462]`, backlog 321).
// Editor-chosen gradient base color. 'black' is a palette-independent neutral darken,
// darker than the dark scrim at every opacity, so it holds wherever the scrim does.
// 'auto' and a stored 'action' (retired, `[R-462]`) draw the tone's own color.
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
  tone = 'dark',
  color = 'auto',
  direction = 'auto',
  textRight = false,
}: {
  style?: HeroScrimStyle
  opacity: number
  align?: HeroScrimAlign
  tone?: HeroScrimTone
  // Gradient-only: the fade color (from the color system) and direction. 'auto'
  // preserves the derived behavior (tone color, alignment-based direction).
  /** The text sits on the right (the hero's figure on the left, monorepo `[R-641]`): the auto gradient darkens there. */
  textRight?: boolean
  color?: HeroScrimColor
  direction?: HeroScrimDirection
}) {
  const floor = tone === 'dark' ? MIN_TEXT_SCRIM_OPACITY : MIN_LIGHT_SCRIM_OPACITY
  const effective = Math.max(opacity, floor)
  if (style !== 'gradient') {
    return <div className={`absolute inset-0 ${TONE_BG[tone]}`} style={{opacity: effective / 100}} data-testid="hero-scrim" />
  }
  const base = color === 'black' && tone === 'dark' ? COLOR_BASE.black : `var(${TONE_VAR[tone]})`
  const strong = `color-mix(in srgb, ${base} ${effective}%, transparent)`
  const weak = `color-mix(in srgb, ${base} ${floor}%, transparent)`
  const dir = direction !== 'auto' ? DIR_CSS[direction] : align === 'center' ? 'to top' : textRight ? 'to left' : 'to right'
  return (
    <div
      className="absolute inset-0"
      style={{backgroundImage: `linear-gradient(${dir}, ${strong}, ${weak})`}}
      data-testid="hero-scrim"
    />
  )
}
