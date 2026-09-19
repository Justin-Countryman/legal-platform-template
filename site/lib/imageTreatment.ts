// ─── Image treatment ──────────────────────────────────────────────────────────
//
// How an image sits in its placement: plain, framed, slab, rounded, scrim or
// tint ([R-441]; Phase 11, 2026-09-14, monorepo WS-V1-PHASE11-DESIGN §7
// amendment 4).
//
// RESOLVED HERE, IN TS, NEVER BY A CSS TOKEN. A stored `inherit` (or nothing)
// takes the SITE DEFAULT, which the dispatcher passes down as a value, the way
// it passes the results disclaimer. A CSS custom property cannot be read by the
// code that picks classes, and a component must know the resolved treatment (a
// scrim changes where text can sit; a cutout and a section background accept
// only some treatments). The site default is `designSettings.imageFrame`
// (`plain`, `framed` or `slab`; Phase 16B), carried to the content section in the
// walk's per-band site look; with none, `inherit` resolves to `plain`.
//
// TOKENS. `framed` and `tint` read the decor role on the element, so the dark
// and light cascade swaps reach them; `slab` reads `--color-slab`, which the
// cascade blocks swap (the dark ground on a light band, the accent on a dark one:
// in the dark ground it vanished on every dark band, Phase 16B amendment 13);
// `scrim` reads `--color-brand-dark`. Nothing here aliases a color at `:root` (an
// alias computed there misses the swap) and nothing carries a literal color.
// `framed` makes no contrast claim: an inset frame's neighbour is the photograph,
// which is not a token pair.
//
// CORNERS (Phase 16B, `[R-479]`). A feature photo takes the site's corner family
// (`rounded-ui`): square on a Sharp site, rounded to the card radius otherwise,
// because in the study rounded photos never appear on a sharp-cornered site. So
// `plain`, `framed` and `slab` all round, and a stored `rounded` renders as
// `plain`, which now does the same thing.
//
// The classes live in a TS map, where neither the class checker nor ESLint looks,
// so `__tests__/imageTreatment.test.ts` resolves every one through Tailwind's own
// design system.

export const RESOLVED_TREATMENTS = ['plain', 'framed', 'slab', 'rounded', 'scrim', 'tint'] as const
export type ResolvedTreatment = (typeof RESOLVED_TREATMENTS)[number]
export type ImageTreatment = ResolvedTreatment | 'inherit'

export type TreatmentContext = 'contentMedia' | 'cutout' | 'sectionBackground' | 'attorneyCard'

/** Which treatments a placement accepts. `sectionBackground` and `attorneyCard` are Phase 13's. */
export const ALLOWED_TREATMENTS: Record<TreatmentContext, readonly ResolvedTreatment[]> = {
  contentMedia: RESOLVED_TREATMENTS,
  // A cutout is a figure on a transparent ground: a frame, a crop or a wash has
  // nothing to sit on. A slab behind it is the one composition that works.
  cutout: ['plain', 'slab'],
  sectionBackground: ['scrim', 'tint'],
  attorneyCard: ['plain', 'framed', 'rounded'],
}

/** What a placement falls back to when the wanted treatment is not allowed there. */
const CONTEXT_FALLBACK: Record<TreatmentContext, ResolvedTreatment> = {
  contentMedia: 'plain',
  cutout: 'plain',
  // A background image carries text, and today's overlay is a scrim.
  sectionBackground: 'scrim',
  attorneyCard: 'plain',
}

export function isResolvedTreatment(value: unknown): value is ResolvedTreatment {
  return typeof value === 'string' && (RESOLVED_TREATMENTS as readonly string[]).includes(value)
}

/** The ground a placement sits on. Phase 15 replaced the `onDarkSurface` boolean:
 *  a saturated band is neither light nor dark, and it is the section's own
 *  `buttonContext`, so a caller passes what it already has. */
export type TreatmentGround = 'light' | 'dark' | 'saturated'

/**
 * The treatment a placement renders. An explicit value wins; `inherit`, null or
 * an unknown value takes `siteDefault`; with no site default, `plain`. The
 * placement's allowed set applies last. Off a light ground `tint` renders plain:
 * an accent multiplied over a photo on a dark band only darkens it, and on a
 * saturated band the accent IS the ground, where the cascade resolves the wash to
 * the band's one text color — white, which multiplies to nothing, or a near-black,
 * which is the dark case again (Phase 15 amendment 18).
 */
export function resolveTreatment(
  value: string | null | undefined,
  siteDefault: string | null | undefined,
  context: TreatmentContext,
  ground: TreatmentGround = 'light',
): ResolvedTreatment {
  const wanted = isResolvedTreatment(value) ? value : isResolvedTreatment(siteDefault) ? siteDefault : 'plain'
  const allowed = ALLOWED_TREATMENTS[context].includes(wanted) ? wanted : CONTEXT_FALLBACK[context]
  return allowed === 'tint' && ground !== 'light' && context !== 'sectionBackground' ? 'plain' : allowed
}

export type TreatmentClasses = {wrapper: string; image: string}

/** Exported for the test that resolves every class through Tailwind. */
export const TREATMENT_CLASSES: Record<ResolvedTreatment, TreatmentClasses> = {
  plain: {wrapper: 'relative overflow-hidden rounded-ui', image: 'block h-auto w-full'},
  framed: {
    wrapper:
      'relative overflow-hidden rounded-ui after:pointer-events-none after:absolute after:inset-3 after:border-2 after:border-decor md:after:inset-4',
    image: 'block h-auto w-full',
  },
  // The slab is a pseudo-element offset OUTSIDE the photo, so the wrapper cannot
  // clip: the photo and the slab each take the corners.
  slab: {
    wrapper:
      'relative isolate before:absolute before:inset-0 before:-z-10 before:translate-x-3 before:translate-y-3 before:rounded-ui before:bg-slab md:before:translate-x-5 md:before:translate-y-5',
    image: 'relative block h-auto w-full rounded-ui',
  },
  rounded: {wrapper: 'relative overflow-hidden rounded-ui', image: 'block h-auto w-full'},
  scrim: {
    wrapper:
      'relative overflow-hidden rounded-ui after:pointer-events-none after:absolute after:inset-0 after:bg-linear-to-t after:from-brand-dark/80 after:to-transparent',
    image: 'block h-auto w-full',
  },
  tint: {
    wrapper: 'relative overflow-hidden rounded-ui after:pointer-events-none after:absolute after:inset-0 after:bg-decor/20 after:mix-blend-multiply',
    image: 'block h-auto w-full',
  },
}

/** The classes a placement renders. A cutout is a figure on a transparent
 *  ground, so it never takes the corners: rounding it would only clip the figure. */
export function treatmentClasses(resolved: ResolvedTreatment, context?: TreatmentContext): TreatmentClasses {
  const classes = TREATMENT_CLASSES[resolved]
  if (context !== 'cutout') return classes
  const square = (s: string) => s.split(' ').filter((c) => c !== 'overflow-hidden' && !/(^|:)rounded-ui$/.test(c)).join(' ')
  return {wrapper: square(classes.wrapper), image: square(classes.image)}
}
