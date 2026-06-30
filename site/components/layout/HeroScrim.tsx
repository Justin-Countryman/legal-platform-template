// Shared hero legibility scrim — one implementation for every full-bleed hero
// background (the internal-hero backdrop, the homepage Overlay backdrop, and the
// homepage Section Background). Keeping it here means the flat/gradient + dark/
// light tone logic can never drift between those call sites.
//
//   • style 'flat'     — even overlay at `opacity` (the legacy backdrop scrim).
//   • style 'gradient' — full strength on the text side fading to ~25% toward the
//                        photo; horizontal for left content, bottom-up for centered.
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
  dark: '--color-brand-dark',
  light: '--color-background',
}
const TONE_BG: Record<HeroScrimTone, string> = {
  dark: 'bg-brand-dark',
  light: 'bg-background',
}
// Editor-chosen gradient base color. 'action' is the color-system action token
// (reliably emitted as a CSS var); 'black' is a palette-independent neutral darken.
// 'auto' is handled separately (derived from the tone).
const COLOR_BASE: Record<Exclude<HeroScrimColor, 'auto'>, string> = {
  action: 'var(--color-action)',
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
}: {
  style?: HeroScrimStyle
  opacity: number
  align?: HeroScrimAlign
  tone?: HeroScrimTone
  // Gradient-only: the fade color (from the color system) and direction. 'auto'
  // preserves the derived behavior (tone color, alignment-based direction).
  color?: HeroScrimColor
  direction?: HeroScrimDirection
}) {
  if (style !== 'gradient') {
    return <div className={`absolute inset-0 ${TONE_BG[tone]}`} style={{opacity: opacity / 100}} data-testid="hero-scrim" />
  }
  const base = color !== 'auto' ? COLOR_BASE[color] : `var(${TONE_VAR[tone]})`
  const strong = `color-mix(in srgb, ${base} ${opacity}%, transparent)`
  const weak = `color-mix(in srgb, ${base} ${Math.round(opacity * 0.25)}%, transparent)`
  const dir = direction !== 'auto' ? DIR_CSS[direction] : align === 'center' ? 'to top' : 'to right'
  return (
    <div
      className="absolute inset-0"
      style={{backgroundImage: `linear-gradient(${dir}, ${strong}, ${weak})`}}
      data-testid="hero-scrim"
    />
  )
}
