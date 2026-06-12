// ─── Silo nav hover presets ─────────────────────────────────────────────────────
// Hover is a composable axis (like surface + button style): the operator picks a
// hoverEffect and every button in that silo nav inherits it. Five tight presets,
// all on the gentle (non-front-loaded) easing + platform duration tokens, all
// reduced-motion-safe (tokens collapse to 10ms).
//
//   imageZoom    — the bg image scales ~1.05 + the arrow shifts
//   lift         — the tile raises + an opacity-faded elevation shadow + arrow shift
//   glow         — a clearly-visible accent glow fades in over the tile
//   accentBorder — a 2px accent inset border draws in (clearly readable)
//   none         — TRULY static; nothing changes on hover but the focus ring/cursor
//
// CRITICAL (Tailwind v4): a translate animates the `translate` property, a zoom the
// `scale` property — NOT `transform`. The standard `transition-transform` utility's
// property list IS transform,translate,scale,rotate, so it eases both. An arbitrary
// `transition-[transform,…]` lists only `transform` and so does NOT ease a
// translate/scale → it snaps. So: any layer that translates/scales uses the standard
// `transition-transform`; border/shadow/opacity use their own single-property
// transitions. siloHover() returns per-layer fragments the tile splices on.

export type SiloHoverEffect =
  | 'imageZoom'
  | 'grayscale'
  | 'lift'
  | 'glow'
  | 'accentBorder'
  | 'accentUnderline'
  | 'iconPop'
  | 'none'

export const SILO_HOVER_EFFECTS: SiloHoverEffect[] = [
  'imageZoom',
  'grayscale',
  'lift',
  'glow',
  'accentBorder',
  'accentUnderline',
  'iconPop',
  'none',
]

// Lift elevation — an opacity-faded ::before shadow (box-shadow itself is never
// animated). transition-transform (standard → includes `translate`) eases the lift.
const LIFT =
  'transition-transform duration-ui-base ease-gentle hover:-translate-y-1 isolate ' +
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-ui before:content-[''] " +
  'before:shadow-elevation-md before:opacity-0 before:transition-opacity before:duration-ui-base before:ease-gentle hover:before:opacity-100'

export type SiloHoverClasses = {
  /** Spliced onto the tile container (<a>). Carries container-level hover (lift). */
  container: string
  /** Spliced onto the bg <Image> (zoom + grayscale; base transitions scale + filter). */
  image: string
  /** Spliced onto the accent glow overlay (the base already has transition-opacity). */
  glow: string
  /** Spliced onto the arrow (the base already has transition-transform). */
  arrow: string
  /** Spliced onto the top border overlay (above the image/scrim/glow so it's visible). */
  border: string
  /** Non-empty → render the accent underline element under the label (it scales in). */
  underline: string
  /** Spliced onto the icon chip (it pops on hover; base has transition-transform). */
  icon: string
}

// Effects are independent layers, so ANY combination composes — each selected
// effect just activates its own layer. An empty array = a fully static hover.
export function siloHover(effects: SiloHoverEffect[]): SiloHoverClasses {
  const has = (e: SiloHoverEffect) => effects.includes(e)
  return {
    container: has('lift') ? LIFT : '',
    // Image layer composes zoom + grayscale (B&W at rest → colour on hover). The
    // base transitions `scale` + `filter`, so both ease.
    image: [
      has('imageZoom') ? 'group-hover:scale-105' : '',
      has('grayscale') ? 'grayscale group-hover:grayscale-0' : '',
    ]
      .filter(Boolean)
      .join(' '),
    glow: has('glow') ? 'group-hover:opacity-100' : '',
    // Refined arrow shift — on the movement presets (where it reads well).
    arrow: has('imageZoom') || has('lift') ? 'group-hover:translate-x-1' : '',
    // Accent border draws on a TOP overlay (the container's own border/shadow would
    // be occluded by the full-bleed image/scrim/glow layers). border-color eases.
    border: has('accentBorder') ? 'group-hover:border-action' : '',
    // Accent underline scales in (transform, no reflow) under the label.
    underline: has('accentUnderline') ? 'group-hover:scale-x-100' : '',
    // Icon pop — the icon chip lifts + scales a touch (only when an icon is present).
    icon: has('iconPop') ? 'group-hover:-translate-y-0.5 group-hover:scale-110' : '',
  }
}

// Sensible default per button style, so operators needn't configure hover.
const STYLE_DEFAULT: Record<string, SiloHoverEffect> = {
  indexCards: 'imageZoom',
  spotlight: 'imageZoom',
  feature: 'imageZoom',
  split: 'imageZoom',
  tile: 'glow',
  inline: 'accentBorder',
}

export function defaultHoverForStyle(style?: string | null): SiloHoverEffect {
  return (style && STYLE_DEFAULT[style]) || 'imageZoom'
}

// Resolve the operator's selection into the effects to apply:
//   • includes 'none'  → [] (explicitly static; 'none' overrides the rest)
//   • non-empty        → exactly the (valid) chosen effects, all composed
//   • unset / empty    → the per-style default (a single effect)
export function resolveHovers(effects?: string[] | null, style?: string | null): SiloHoverEffect[] {
  const valid = (effects ?? []).filter((e): e is SiloHoverEffect =>
    (SILO_HOVER_EFFECTS as string[]).includes(e),
  )
  if (valid.includes('none')) return []
  if (valid.length > 0) return valid
  return [defaultHoverForStyle(style)]
}
