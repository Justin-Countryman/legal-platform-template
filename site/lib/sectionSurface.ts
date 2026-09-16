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
//   light   — base background (white). The neutral default.
//   tint    — bg-hero-tint, the neutral near-white used for light hero bands.
//   dark    — bg-brand-dark, white text (the contrast / drama surface).
//   accent  — bg-muted, the soft accent-tinted light wash (warm vs tint's neutral).
//   image   — a background image + dark scrim + white text (immersive).
//   pattern — NO background class at all: the page background layer shows through
//             (Phase 13). Text polarity is the light cascade, because the page
//             ground is a light ground until Phase 16's themes say otherwise.
//
// A bolder saturated-accent surface is intentionally deferred to the brand-color
// system work — `accent` stays a safe light wash for v1 (no contrast risk, no new
// tokens). See memory color-system.
//
// ─── Phase 13, the section frame ─────────────────────────────────────────────────
//
// `surface` alone cannot make a stacked page read as one design, for a reason
// measured on the deployed build in 2026-07 and re-measured in the Phase 13
// challenge: two bands set to the SAME surface render as one continuous colour
// with no seam, and then put 128px of doubled padding at the join (192px from
// 768px, 224px from 992px — `--breakpoint-lg` here is 992, not Tailwind's 1024).
// Two sections grouped onto one background still read as two, not because of a
// visible seam but because of a canyon.
//
// So the frame adds:
//   - `visibleGround()`, which answers "what colour does the visitor SEE here",
//     collapsing `pattern` and an inset band onto the page ground;
//   - a spacing preset split into `top` / `bottom` / `seamTop` / `topNone`, so a
//     dispatcher can halve the top padding at a same-ground join;
//   - the edge classes, which the NEXT band uses to draw the previous band's
//     bottom edge.
//
// WHY THE SEAM IS A PROP AND NOT CSS. `[data-surface="x"] + [data-surface="x"]`
// never matches: `HomepageCanvas` wraps every band after the first in
// `ScrollReveal`'s `<div>`, so bands are not siblings. The wrappers ARE siblings,
// and a rule on them is still wrong: it cannot see that a band rendered nothing,
// it would duplicate the ground computation in CSS and TS, `PageSections` has no
// wrappers at all, and an unlayered rule would beat every breakpoint because
// Tailwind v4 puts utilities in `@layer utilities`. The dispatcher knows adjacency;
// CSS does not.
//
// WHY THE EDGE IS DRAWN BY THE NEXT BAND. Measured in Chrome 152 across all three
// `ScrollReveal` phases: an `::after` on the previous band is invisible while that
// band's wrapper holds `transform: translateY(24px)`, because a transform creates a
// stacking context and the whole subtree paints before the next wrapper — no
// `z-index` on the section can escape it. The edge would be absent below the fold
// and pop in at the end of the 600ms reveal. A `::before` on the NEXT band, at
// `bottom: 100%`, lives in the later wrapper and paints in every phase with no
// z-index at all. See WS-V1-PHASE13-DESIGN §7 amendment 2.
//
// THESE CLASSES ARE IN A `.ts` FILE, WHERE NEITHER CHECKER LOOKS.
// `scripts/check-unknown-utility-classes.mjs` walks only `.tsx`/`.jsx` AND its
// extractor (`scripts/lib/class-candidates.mjs`) reads only JSX `className`
// attributes, so a const map escapes it even in a `.tsx` file — a planted
// `bg-zzz-not-a-class` passed both the class checker and eslint in the Phase 13
// challenge. Every class below is therefore resolved through Tailwind's own design
// system by `lib/__tests__/sectionSurface.test.ts`, the guard
// `lib/imageTreatment.ts` already documents for the same reason.

export type SectionSurface = 'light' | 'tint' | 'dark' | 'accent' | 'image' | 'pattern'
export type SectionSpacing = 'compact' | 'normal' | 'spacious'

/** What the visitor actually sees behind a band. `pattern` and an inset band show
 *  the page ground, so two of them in a row are a same-ground join. */
export type VisibleGround = 'light' | 'tint' | 'dark' | 'image' | 'page'

/** The bottom edge a band cuts into the one below it. Desktop and up only. */
export type SectionEdge = 'flat' | 'angled'

export const DEFAULT_SECTION_SURFACE: SectionSurface = 'light'
export const DEFAULT_SECTION_SPACING: SectionSpacing = 'normal'

export type SectionSpacingSteps = {
  /** Top padding at a normal join. */
  top: string
  /** Bottom padding, always. */
  bottom: string
  /** Top padding at a same-ground join: half of `top`, per breakpoint. */
  seamTop: string
  /** No top padding, so a band can overlap the one above it by exactly its
   *  negative margin. */
  topNone: string
}

// Vertical rhythm presets. Horizontal padding (px-[5%]) is applied by the shell.
//
// `top + bottom` reproduces the old single `py-*` string exactly, per breakpoint,
// so a band that takes no seam and no overlap renders as it always has. That
// matters more than it looks: the composer and the canvas migration deliberately
// write NO `spacing` at all (item 308, [R-450]), so "absent" must keep meaning
// `normal` and must keep rendering identically.
//
// `seamTop` is a responsive triple, not one value, because one value cannot halve
// 64, 96 and 112 at once.
export const SECTION_SPACING: Record<SectionSpacing, SectionSpacingSteps> = {
  compact: {
    top:     'pt-12 md:pt-16',
    bottom:  'pb-12 md:pb-16',
    seamTop: 'pt-6 md:pt-8',
    topNone: 'pt-0',
  },
  normal: {
    top:     'pt-16 md:pt-24 lg:pt-28',
    bottom:  'pb-16 md:pb-24 lg:pb-28',
    seamTop: 'pt-8 md:pt-12 lg:pt-14',
    topNone: 'pt-0',
  },
  spacious: {
    top:     'pt-24 md:pt-32 lg:pt-40',
    bottom:  'pb-24 md:pb-32 lg:pb-40',
    seamTop: 'pt-12 md:pt-16 lg:pt-20',
    topNone: 'pt-0',
  },
}

// A fourth preset the operator never sees. `cta/centered` shipped at
// `py-10 md:py-12`, which matches nothing above, and moving it onto the shell
// without this would change a live band's padding. It is not in
// `SectionSpacing`, so it cannot be stored, chosen or written by any tool.
export const TIGHT_SPACING: SectionSpacingSteps = {
  top:     'pt-10 md:pt-12',
  bottom:  'pb-10 md:pb-12',
  seamTop: 'pt-5 md:pt-6',
  topNone: 'pt-0',
}

export type ResolvedSectionSurface = {
  /** Background class for the section band. Empty for `pattern`. */
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
    // NO background class: the page background layer shows through. This is the
    // whole mechanism — the band paints nothing and the layer behind it is what
    // the visitor sees. A `pattern` band on a site with no page layer therefore
    // renders exactly as `light`, which is stated on the schema field and raised
    // as a build NOTE rather than blocked: Studio cannot check it, because inside
    // a canvas member `parent` is the member, not `designSettings`.
    case 'pattern':
      return {surfaceClass: '', ringContext: undefined, buttonContext: 'light', isImage: false}
    case 'light':
    default:
      return {surfaceClass: 'bg-background', ringContext: undefined, buttonContext: 'light', isImage: false}
  }
}

/** What the visitor sees behind this band, which is what decides a seam.
 *
 *  An inset band keeps its own surface but renders as a panel inside the
 *  container, so the page ground runs past it on both sides and ABOVE and BELOW
 *  it: two inset bands in a row are a same-ground join even when the panels
 *  differ. `pattern` is the same case with no panel. */
export function visibleGround(
  appearance: {surface?: SectionSurface | null; inset?: boolean | null} | null | undefined,
): VisibleGround {
  if (appearance?.inset) return 'page'
  switch (appearance?.surface) {
    case 'dark':    return 'dark'
    case 'image':   return 'image'
    case 'tint':    return 'tint'
    // `accent` is `bg-muted`, a light wash. It is its own ground for seam
    // purposes: `accent` above `light` is a real colour change.
    case 'accent':  return 'tint'
    case 'pattern': return 'page'
    case 'light':
    default:        return 'light'
  }
}

// The edge the NEXT band draws for the band above it, keyed on what that band's
// ground actually was. `page` paints nothing on purpose: there is no solid colour
// to cut, and an inset or pattern band has the page ground on both sides of the
// seam already.
//
// `image` also paints nothing. The photo is a `SanityImage` child element, not a
// background, so an edge could only inherit the `bg-brand-dark` base underneath
// it and would render a flat dark wedge that matches no part of the band above.
const EDGE_FROM_CLASS: Record<VisibleGround, string> = {
  light: 'before:bg-background',
  tint:  'before:bg-hero-tint',
  dark:  'before:bg-brand-dark',
  image: '',
  page:  '',
}

// The wedge itself, on the NEXT band, reaching up over the previous one.
//
// `md:` and up: mobile renders flat. At 390px a diagonal across a full-width band
// is either invisible or eats a heading, and the study captured desktop only.
//
// `@supports` gates the pseudo-element's EXISTENCE, not just its clip: without
// `clip-path` this would paint a solid 64px bar across the top of the band, which
// is worse than a flat seam. Tailwind v4 spells that `supports-[...]`.
//
// `pointer-events-none` because the pseudo-element is a child box lying over the
// band's own top strip, and without it the band grows a full-width dead zone.
//
// Capped at 4rem, which is the `compact` preset's own top padding at `md`, so the
// wedge can never reach a heading: WCAG 2.2's 2.4.11 (focus not obscured) and
// 1.4.12 (text spacing) both bind here, and an edge taller than the padding it
// covers can hide a focused control.
const EDGE_ANGLED =
  'md:before:pointer-events-none md:before:absolute md:before:inset-x-0 md:before:bottom-full md:before:h-16 ' +
  'md:before:[clip-path:polygon(0_0,100%_100%,0_100%)] md:supports-[not_(clip-path:polygon(0_0))]:before:hidden'

/** The classes a band needs to draw the edge of the band ABOVE it.
 *
 *  Called with the PREVIOUS band's ground and the PREVIOUS band's `edgeBottom`,
 *  because the previous band owns the choice and the next band owns the paint. */
export function sectionEdgeClasses(
  previousGround: VisibleGround | null | undefined,
  edge: SectionEdge | null | undefined,
): string {
  if (edge !== 'angled' || !previousGround) return ''
  const from = EDGE_FROM_CLASS[previousGround]
  return from ? `${EDGE_ANGLED} ${from}` : ''
}

/** True when the previous band's edge makes a seam meaningless: the wedge already
 *  fills the join, so halving the padding on top of it would crowd the heading. */
export function edgeCancelsSeam(
  previousGround: VisibleGround | null | undefined,
  edge: SectionEdge | null | undefined,
): boolean {
  return sectionEdgeClasses(previousGround, edge) !== ''
}

/** Exported for the test that resolves every class through Tailwind's own design
 *  system. Nothing in the app reads it. */
export const ALL_FRAME_CLASSES: readonly string[] = [
  ...Object.values(SECTION_SPACING).flatMap((s) => [s.top, s.bottom, s.seamTop, s.topNone]),
  TIGHT_SPACING.top, TIGHT_SPACING.bottom, TIGHT_SPACING.seamTop, TIGHT_SPACING.topNone,
  ...Object.values(EDGE_FROM_CLASS).filter(Boolean),
  EDGE_ANGLED,
  'bg-brand-dark', 'bg-hero-tint', 'bg-muted', 'bg-background',
]
  .join(' ')
  .split(/\s+/)
  .filter(Boolean)
