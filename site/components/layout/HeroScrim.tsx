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

const TONE_VAR: Record<HeroScrimTone, string> = {
  dark: '--color-brand-dark',
  light: '--color-background',
}
const TONE_BG: Record<HeroScrimTone, string> = {
  dark: 'bg-brand-dark',
  light: 'bg-background',
}

export function HeroScrim({
  style = 'flat',
  opacity,
  align = 'left',
  tone = 'dark',
}: {
  style?: HeroScrimStyle
  opacity: number
  align?: HeroScrimAlign
  tone?: HeroScrimTone
}) {
  if (style !== 'gradient') {
    return <div className={`absolute inset-0 ${TONE_BG[tone]}`} style={{opacity: opacity / 100}} data-testid="hero-scrim" />
  }
  const v = TONE_VAR[tone]
  const strong = `color-mix(in srgb, var(${v}) ${opacity}%, transparent)`
  const weak = `color-mix(in srgb, var(${v}) ${Math.round(opacity * 0.25)}%, transparent)`
  const dir = align === 'center' ? 'to top' : 'to right'
  return (
    <div
      className="absolute inset-0"
      style={{backgroundImage: `linear-gradient(${dir}, ${strong}, ${weak})`}}
      data-testid="hero-scrim"
    />
  )
}
