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
//   muted   — bg-muted, the card step one notch off the light ground. NOT an
//             operator option: it is the code default of the CTAs, and what a band
//             stored with the retired `accent` value renders (Phase 14).
//   accent  — NOT A SURFACE. Retired as an option in Phase 14; a band stored with it
//             before then renders exactly as `muted`. It is accepted as a
//             `StoredSurface` and normalised here, and is not in `SectionSurface`
//             (Phase 15), so this file never lists it beside a surface that paints
//             the accent. The value is never reused for another surface.
//   image   — a background image + dark scrim + white text (immersive).
//   pattern — the light ground wearing the site's section texture, which the band
//             paints itself (Phase 16A). Offered on homepage sections only; nothing
//             else on the site, and no interior page, ever shows a texture. ONE
//             meaning under every theme since Phase 17B: the texture a theme puts on
//             a dark band is a paint flag on the band's seam, never the surface value.
//
//   saturated — the accent as a full-width fill (`bg-accent-fill`), text in
//             `accent-fg` through the `[data-ring-context="saturated"]` block,
//             buttons in their own context (Phase 15, WS-V1-PHASE15-DESIGN §7
//             amendments 11 to 17). Offered on the content section only: the
//             other sections draw controls in the action color, which can equal
//             the fill.
//
// ─── Phase 13, the section frame ─────────────────────────────────────────────────
//
// `surface` alone cannot make a stacked page read as one design, for a reason
// measured on the deployed build in 2026-07 and re-measured in the Phase 13
// challenge: two bands set to the SAME surface render as one continuous color
// with no seam, and then put 128px of doubled padding at the join (192px from
// 768px, 224px from 992px — `--breakpoint-lg` here is 992, not Tailwind's 1024).
// Two sections grouped onto one background still read as two, not because of a
// visible seam but because of a canyon.
//
// So the frame adds:
//   - `visibleGround()`, which answers "what color does the visitor SEE here",
//     which walks `pattern` and an inset band as the light ground;
//   - a spacing preset split into `top` / `bottom` / `seamTop` / `topOverlap` /
//     `bottomBeforeOverlap`, so a
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

export type SectionSurface = 'light' | 'tint' | 'dark' | 'muted' | 'image' | 'pattern' | 'saturated'
/** Every surface, for the tests that must cover each one. */
export const SECTION_SURFACES: readonly SectionSurface[] = ['light', 'tint', 'dark', 'muted', 'image', 'pattern', 'saturated']
/** What a document may store: a surface, or the legacy `accent`, which renders as `muted`. */
export type StoredSurface = SectionSurface | 'accent'
export type SectionSpacing = 'compact' | 'normal' | 'spacious'

/** What the visitor actually sees behind a band, which is what decides a seam.
 *  There is no page ground any more (Phase 16A, `[R-472]`): a `pattern` band is the
 *  light ground wearing a faint texture, and the page around an inset panel is the
 *  light ground, so both walk as `light`. */
export type VisibleGround = 'light' | 'tint' | 'muted' | 'dark' | 'image' | 'saturated'

export const DEFAULT_SECTION_SURFACE: SectionSurface = 'light'
export const DEFAULT_SECTION_SPACING: SectionSpacing = 'normal'

export type SectionSpacingSteps = {
  /** Top padding at a normal join. */
  top: string
  /** Bottom padding, always. */
  bottom: string
  /** Top padding at a same-ground join: half of `top`, per breakpoint. */
  seamTop: string
  /** Top padding of an inset panel that overlaps the band above: the preset's
   *  own padding on phones, where nothing overlaps, and none from `md`, so the
   *  negative margin IS the overlap. */
  topOverlap: string
  /** Bottom padding of the band ABOVE an overlapping panel: the preset's own plus
   *  the overlap from `md`, so the panel covers only padding it added and never
   *  the band's content (Phase 16A, `[R-475]`). */
  bottomBeforeOverlap: {small: string; large: string; photo: string}
  /** The utility that publishes this preset's own top padding as `--band-pt`, so the
   *  raised photo can cancel it at every breakpoint (Phase 16E). Put on a band that
   *  raises a photo and on no other, so nothing else gains a class. */
  ptVar: string
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
    topOverlap: 'pt-12 md:pt-0',
    bottomBeforeOverlap: {small: 'pb-12 md:pb-28', large: 'pb-12 md:pb-40', photo: 'pb-12 md:pb-16 xl:pb-32'},
    ptVar: 'band-pt-compact',
  },
  normal: {
    top:     'pt-16 md:pt-24 lg:pt-28',
    bottom:  'pb-16 md:pb-24 lg:pb-28',
    seamTop: 'pt-8 md:pt-12 lg:pt-14',
    topOverlap: 'pt-16 md:pt-0',
    bottomBeforeOverlap: {small: 'pb-16 md:pb-36 lg:pb-40', large: 'pb-16 md:pb-48 lg:pb-52', photo: 'pb-16 md:pb-24 lg:pb-28 xl:pb-44'},
    ptVar: 'band-pt-normal',
  },
  spacious: {
    top:     'pt-24 md:pt-32 lg:pt-40',
    bottom:  'pb-24 md:pb-32 lg:pb-40',
    seamTop: 'pt-12 md:pt-16 lg:pt-20',
    topOverlap: 'pt-24 md:pt-0',
    bottomBeforeOverlap: {small: 'pb-24 md:pb-44 lg:pb-52', large: 'pb-24 md:pb-56 lg:pb-64', photo: 'pb-24 md:pb-32 lg:pb-40 xl:pb-56'},
    ptVar: 'band-pt-spacious',
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
  topOverlap: 'pt-10 md:pt-0',
  bottomBeforeOverlap: {small: 'pb-10 md:pb-24', large: 'pb-10 md:pb-36', photo: 'pb-10 md:pb-12 xl:pb-28'},
  ptVar: 'band-pt-tight',
}

export type ResolvedSectionSurface = {
  /** Background class for the section band. */
  surfaceClass: string
  /** True for `pattern`: the shell paints the site's section texture over the light
   *  ground. Nothing else on the site ever wears it. */
  textured: boolean
  /** `data-ring-context` value — 'dark' on dark/image surfaces, 'saturated' on the accent fill, else omitted. */
  ringContext: 'dark' | 'saturated' | undefined
  /** Surface context for Button / ButtonGroup inside the section. */
  buttonContext: 'light' | 'dark' | 'saturated'
  /** True when the caller should render a background image + scrim (image surface). */
  isImage: boolean
}

export function sectionSurface(surface: StoredSurface | null | undefined): ResolvedSectionSurface {
  switch (surface) {
    case 'dark':
      return {surfaceClass: 'bg-brand-dark', ringContext: 'dark', buttonContext: 'dark', isImage: false, textured: false}
    case 'image':
      // The image rides on a brand-dark base so a missing/loading image still has
      // a safe dark surface for the white text + scrim.
      return {surfaceClass: 'bg-brand-dark', ringContext: 'dark', buttonContext: 'dark', isImage: true, textured: false}
    case 'saturated':
      return {surfaceClass: 'bg-accent-fill', ringContext: 'saturated', buttonContext: 'saturated', isImage: false, textured: false}
    case 'tint':
      return {surfaceClass: 'bg-hero-tint', ringContext: undefined, buttonContext: 'light', isImage: false, textured: false}
    case 'muted':
    case 'accent': // the legacy stored value (see the header)
      return {surfaceClass: 'bg-muted', ringContext: undefined, buttonContext: 'light', isImage: false, textured: false}
    // The light ground plus the site's section texture, painted by the band itself
    // (`SectionShell`). Phase 13 left this band transparent so a page-wide layer
    // showed through; that layer is gone (Phase 16A, `[R-472]`: no site-wide
    // background, interior pages always clean). With no `patternTexture` set the
    // texture is `none` and the band looks exactly like `light`.
    // Until Phase 17B a style set could flip this band onto the dark ground
    // (`patternGround`, `[R-479]`); the texture on a dark band is the theme's paint
    // now (`lib/flows.ts`), carried on the seam, and a stored Pattern band is always
    // the light ground with the texture.
    case 'pattern':
      return {surfaceClass: 'bg-background', ringContext: undefined, buttonContext: 'light', isImage: false, textured: true}
    case 'light':
    default:
      return {surfaceClass: 'bg-background', ringContext: undefined, buttonContext: 'light', isImage: false, textured: false}
  }
}

/** What the visitor sees behind this band, which is what decides a seam.
 *
 *  An inset band keeps its own surface but renders as a panel inside the
 *  container, so the light ground runs past it on both sides and ABOVE and BELOW
 *  it: two inset bands in a row are a same-ground join even when the panels
 *  differ. A `pattern` band is the light ground with a faint texture, so it joins
 *  a light band as one ground. */
export function visibleGround(
  appearance: {surface?: StoredSurface | null; inset?: boolean | null} | null | undefined,
): VisibleGround {
  if (appearance?.inset) return 'light'
  switch (appearance?.surface) {
    case 'dark':    return 'dark'
    case 'image':   return 'image'
    case 'tint':    return 'tint'
    case 'saturated': return 'saturated'
    // `muted` (and a stored `accent`) is `bg-muted`, its own ground: it seams only
    // with another muted band, and its edge is painted in `bg-muted`. Phase 13
    // mapped it to `tint`, which halved the padding between two different colors
    // and painted a hero-tint wedge beside a muted band (Phase 14 challenge).
    case 'muted':
    case 'accent':  return 'muted'
    case 'pattern': return 'light'
    case 'light':
    default:        return 'light'
  }
}

// Phase 16C: the bottom edge a band stored (`edgeBottom`) is gone, and with it
// `EDGE_ANGLED`, `sectionEdgeClasses` and `edgeCancelsSeam`. A divider is placed by the
// rule in `components/sections/sectionFrame.ts` (`[R-481]`: under the hero and wherever
// the page enters a dark or saturated section), its shape is the site's
// (`designSettings.sectionJoin`), and `SectionShell` paints it.

/** Exported for the test that resolves every class through Tailwind's own design
 *  system. Nothing in the app reads it. */
export const ALL_FRAME_CLASSES: readonly string[] = [
  ...[...Object.values(SECTION_SPACING), TIGHT_SPACING].flatMap((s) => [
    s.top, s.bottom, s.seamTop, s.topOverlap, s.bottomBeforeOverlap.small, s.bottomBeforeOverlap.large,
    s.bottomBeforeOverlap.photo, s.ptVar,
  ]),
  'bg-brand-dark', 'bg-hero-tint', 'bg-muted', 'bg-background', 'bg-accent-fill',
  // Phase 16C: the divider's own classes, which live in `SectionShell`'s maps and in the
  // hero's spacer, where neither checker looks.
  'divider-cut', 'divider-rise', 'divider-flip', 'mt-divider', 'h-divider',
  'before:bg-background', 'before:bg-hero-tint', 'before:bg-muted', 'before:bg-brand-dark', 'before:bg-accent-fill',
  // Phase 16D: the ghost's own classes, which live in `SectionShell`'s JSX but whose
  // utility is defined in `globals.css`, so the resolution test covers them too.
  'decor-ghost', 'section-texture-dark', 'text-brand-dark', 'opacity-4',
  'section-texture-strong', 'section-texture-on-light', 'section-texture-on-dark',
  // Phase 16E: the raised photo's utility and its column alignment.
  'xl:photo-rise', 'xl:self-start',
  // Phase 16F: the gradient on a dark band, and the band's place in its run.
  'band-gradient',
  // Phase 17B: the theme's hairline at the top of a band, defined in `globals.css`, and its
  // accent ink (session 5).
  'hairline-top', 'hairline-accent',
  // Phase 17B session 6: a window of the hero's photograph, toned by the scrim.
  'photo-window', 'grayscale',
  // WRITTEN OUT, not generated. Tailwind's own scanner looks for candidate STRINGS in
  // source; a class built from a template literal in the shell is invisible to it and
  // the utility is never emitted (measured: 0 occurrences in the served stylesheet).
  // These literals are what makes the utilities exist at all, as well as what the
  // resolution test reads.
  'grad-i-0', 'grad-i-1', 'grad-i-2', 'grad-i-3', 'grad-i-4', 'grad-i-5', 'grad-i-6', 'grad-i-7',
  'grad-n-1', 'grad-n-2', 'grad-n-3', 'grad-n-4', 'grad-n-5', 'grad-n-6', 'grad-n-7', 'grad-n-8',
]
  .join(' ')
  .split(/\s+/)
  .filter(Boolean)
