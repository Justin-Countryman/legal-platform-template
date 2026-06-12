// ─── Section appearance contract ────────────────────────────────────────────────
// The shared cohesion layer for full-width page sections. Every section renders on
// one of a small set of SURFACES; the cascade-aware text utilities (text-foreground
// / -muted / -subtle, hover:text-action-text, border-border) auto-resolve polarity
// from `.bg-brand-dark` / the `[data-ring-context="dark"]` attribute, so a section
// only swaps its surface class + ring-context and derives button context. This
// generalizes the footer's footerSurface() to ALL sections, so an operator can
// alternate light / tint / dark down a stacked page for rhythm without any section
// hardcoding a background.
//
// Surfaces:
//   light  — base background (white). The neutral default.
//   tint   — bg-hero-tint, the neutral near-white used for light hero bands.
//   dark   — bg-brand-dark, white text (the contrast / drama surface).
//   accent — bg-muted, the soft accent-tinted light wash (warm vs tint's neutral).
//   image  — a background image + dark scrim + white text (immersive).
//
// A bolder saturated-accent surface is intentionally deferred to the brand-color
// system work — `accent` stays a safe light wash for v1 (no contrast risk, no new
// tokens). See memory color-system.

export type SectionSurface = 'light' | 'tint' | 'dark' | 'accent' | 'image'
export type SectionSpacing = 'compact' | 'normal' | 'spacious'

export const DEFAULT_SECTION_SURFACE: SectionSurface = 'light'
export const DEFAULT_SECTION_SPACING: SectionSpacing = 'normal'

// Vertical rhythm presets. Horizontal padding (px-[5%]) is applied by the shell.
export const SECTION_SPACING: Record<SectionSpacing, string> = {
  compact:  'py-12 md:py-16',
  normal:   'py-16 md:py-24 lg:py-28',
  spacious: 'py-24 md:py-32 lg:py-40',
}

export type ResolvedSectionSurface = {
  /** Background class for the section band. */
  surfaceClass: string
  /** `data-ring-context` value — 'dark' on dark/image surfaces, else omitted. */
  ringContext: 'dark' | undefined
  /** Surface context for Button / ButtonGroup inside the section. */
  buttonContext: 'light' | 'dark'
  /** True when the caller should render a background image + scrim (image surface). */
  isImage: boolean
}

export function sectionSurface(surface: SectionSurface | null | undefined): ResolvedSectionSurface {
  switch (surface) {
    case 'dark':
      return {surfaceClass: 'bg-brand-dark', ringContext: 'dark', buttonContext: 'dark', isImage: false}
    case 'image':
      // The image rides on a brand-dark base so a missing/loading image still has
      // a safe dark surface for the white text + scrim.
      return {surfaceClass: 'bg-brand-dark', ringContext: 'dark', buttonContext: 'dark', isImage: true}
    case 'tint':
      return {surfaceClass: 'bg-hero-tint', ringContext: undefined, buttonContext: 'light', isImage: false}
    case 'accent':
      return {surfaceClass: 'bg-muted', ringContext: undefined, buttonContext: 'light', isImage: false}
    case 'light':
    default:
      return {surfaceClass: 'bg-background', ringContext: undefined, buttonContext: 'light', isImage: false}
  }
}
