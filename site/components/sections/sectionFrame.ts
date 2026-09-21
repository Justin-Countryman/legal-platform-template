import {
  type SectionAppearance,
} from '@/components/sections/SectionShell'
import {type VisibleGround, visibleGround} from '@/lib/sectionSurface'

// ─── The seam walk ────────────────────────────────────────────────────────────
//
// Phase 13 (WS-V1-PHASE13-DESIGN §7 amendment 1). Both dispatchers run this over
// their list before rendering anything, and it answers three questions a band
// cannot answer about itself:
//
//   - does it render at all;
//   - does it sit on the same visible ground as the band above it, so the join
//     should carry one padding instead of two;
//   - what ground and what edge did the band above have, so this band can paint
//     that band's bottom edge.
//
// WHY A WALK AND NOT A COMPARISON OF STORED VALUES. Three things defeat the
// record's `i > 0 && visibleGround(prev) === visibleGround(curr)`:
//
// 1. AN INVISIBLE BAND IS NOT A BAND. Eleven components hold sixteen
//    `return null` sites between them — a case-results section with no results,
//    a badges section with no badges, a video section whose embed will not parse.
//    The dispatcher sees a member and a component that renders nothing, so
//    without the walk an empty band becomes the "previous band" and the seam is
//    computed against a ground nobody can see. That is item 312, which is why it
//    is a prerequisite of this phase rather than a tidy-up.
// 2. THE COMPONENT, NOT THE STORED VALUE, OWNS ITS SPACING. A content section
//    with `layout: 'ribbon'` renders `compact` from inside itself when no
//    spacing is stored, and the composer stores none (item 308). Comparing
//    `curr.spacing !== 'compact'` against the stored `undefined` would put a
//    seam on an already-compact band. So each component exports the appearance
//    it will actually use, and the walk reads that.
// 3. AN EDGE FILLS THE JOIN. A band that cut an angled edge into the next one
//    has already closed the gap; halving the padding on top of that crowds the
//    heading.
//
// The shape is deliberately the one `resultsDisclaimer` already uses: a value
// resolved by the dispatcher and handed down as a prop. The site's own look
// (Phase 16B: the photo frame, the join shape, the texture's ground, the card
// hover and style a theme sets) rides the same per-band object, so it reaches
// every section and `SectionShell` without a new prop on any of them.

/** What a section component must export so the walk can see it.
 *
 *  `resolveAppearance` returns the appearance the component WILL render with,
 *  including any default it applies itself. `isEmpty` is true when the component
 *  will render nothing. */
export type FrameResolver<T> = {
  resolveAppearance: (data: T) => SectionAppearance | null | undefined
  isEmpty: (data: T) => boolean
}

/** How far an inset panel rides up over the band above it. */
export type Overlap = 'none' | 'small' | 'large'

/** The site's look, from Design Settings, as the sections read it (Phase 16B,
 *  `[R-468]`). A theme writes these; a section with a value of its own keeps it. */
export type SiteLook = {
  /** The photo frame a feature photo takes when its section stores none. */
  imageFrame: string | null
  /** The site's divider shape (Phase 16C, `[R-482]`); `straight` draws none. */
  sectionJoin: string
  /** A Pattern band sits on the dark ground: only when the site chose a texture
   *  AND the dark ground; with no texture, Pattern renders as Light. */
  patternDark: boolean
  /** The practice-area hover a section with no hover of its own takes. */
  cardHover: string | null
  /** The attorney card style a section with no style of its own takes. */
  attorneyCardStyle: string | null
  /** The initials the ghost draws (Phase 16D, `[R-492]`), or null when the site
   *  draws none. Derived from the firm's name, never stored. */
  ghost?: {text: string} | null
}

/** The site look from the projected Design Settings (`DESIGN_TOKENS_QUERY`). */
export function siteLookOf(d: Record<string, unknown> | null | undefined): SiteLook {
  const s = (k: string) => (typeof d?.[k] === 'string' && d[k] !== '' ? (d[k] as string) : null)
  return {
    imageFrame: s('imageFrame'),
    sectionJoin: s('sectionJoin') ?? 'straight',
    patternDark: s('patternGround') === 'dark' && s('patternTexture') !== null,
    cardHover: s('cardHover'),
    attorneyCardStyle: s('attorneyCardStyle'),
    ghost: null,
  }
}

/** Interior pages are always a clean ground and never draw a divider (`[R-472]`): they
 *  keep the cards, frames and carried pieces, not the homepage's dividers, texture or
 *  ghost. The drop cap and the quote mark DO reach them: they are the UI system's one
 *  decision each, as the card style and the photo frame are (Phase 16B amendment 25). */
export function interiorLook(site: SiteLook | null | undefined): SiteLook | null {
  return site ? {...site, sectionJoin: 'straight', patternDark: false, ghost: null} : null
}

/** A section's own value where it has one; absent and `inherit` follow the site. */
export function followSite<T extends string>(own: T | 'inherit' | null | undefined, site: string | null | undefined): string | null {
  return own && own !== 'inherit' ? own : site ?? null
}

/** Per-band frame props the dispatcher passes into `SectionShell`. */
export type SeamProps = {
  /** The site's look, the same for every band (Phase 16B). */
  site: SiteLook | null
  seamTop: boolean
  previousGround: VisibleGround | null
  /** The overlap of the NEXT band, so this band can keep its content clear of it. */
  nextOverlap: Overlap
  /** The divider this band draws at its top (Phase 16C, `[R-481]`): a cut, painted in the
   *  ground of the band above, or, under the hero, a rise painted in this band's own
   *  ground, which is the only one that is knowable over a photo. */
  divider?: {mode: 'cut'; from: VisibleGround; flip: boolean} | {mode: 'rise'; flip: boolean} | null
  /** This band draws the ghost (Phase 16D). At most one band on a page does. */
  ghost?: boolean
}

export const NO_SEAM: SeamProps = {site: null, seamTop: false, previousGround: null, nextOverlap: 'none', divider: null, ghost: false}

/** Overlap applies to an inset panel only (Phase 16A, `[R-475]`): a full-width band
 *  riding over the one above only hid that band's bottom, text included. */
export function overlapOf(appearance: SectionAppearance | null | undefined): Overlap {
  return appearance?.inset ? (appearance.overlapPrevious ?? 'none') : 'none'
}

/**
 * Walk a list of members, dropping the ones that render nothing, and compute the
 * frame props for each survivor.
 *
 * Returns one entry per SURVIVING member, in order, each carrying the member's
 * own index in the original list (so a caller can still key on it) and its seam
 * props. The first survivor always gets `NO_SEAM` — and it is the first
 * SURVIVOR, not the member at index 0, which is also what fixes the first-block
 * motion rule: `HomepageCanvas` tested `i === 0` on the stored index and nulled
 * the empty member afterwards, so an empty section at index 0 handed the first
 * visible band a `ScrollReveal` wrapper, against the rule that file's own
 * comment calls load-bearing.
 */
export function walkFrame<M>(
  members: readonly M[],
  resolve: (member: M) => {appearance: SectionAppearance | null | undefined; empty: boolean},
  site: SiteLook | null = null,
  hero: VisibleGround | null = null,
): Array<{member: M; index: number; seam: SeamProps}> {
  // Where a divider goes (`[R-481]`, Phase 16C): under the hero, and wherever the page
  // enters a strong ground — dark, a Pattern band on the dark ground included, or
  // saturated. Never into a photo band: no site in the study cuts a shape into one
  // (0 of 53 entries; ADV-P16C-B). Tint and light count as one ground, because a tint
  // wedge on white is 1.04:1 and the band would gain its space for nothing.
  const shaped = !!site && site.sectionJoin !== 'straight'
  const alternates = site?.sectionJoin === 'angledAlternating'
  const strong = (g: VisibleGround | null) => g === 'dark' || g === 'saturated'
  const same = (a: VisibleGround | null, b: VisibleGround | null) =>
    a === b || ((a === 'light' || a === 'tint') && (b === 'light' || b === 'tint'))
  let placed = 0
  const out: Array<{member: M; index: number; seam: SeamProps}> = []
  let prevGround: VisibleGround | null = null

  members.forEach((member, index) => {
    const {appearance, empty} = resolve(member)
    // An invisible band leaves the previous ground untouched, so the band after
    // it seams against the last band anyone can actually see.
    if (empty) return

    const ground = visibleGround(appearance, site?.patternDark)

    // An overlapping panel takes no top padding from `md`, so a seam would be
    // meaningless; `SectionShell` already resolves that, and asking for both
    // here would be a contradiction rather than a refinement.
    const overlapping = overlapOf(appearance) !== 'none'

    const seam: SeamProps =
      out.length === 0
        ? {...NO_SEAM, site}
        : {
            site,
            seamTop: !overlapping && prevGround === ground,
            previousGround: prevGround,
            nextOverlap: 'none',
          }

    // An inset first band takes none: the wedge crossed an overlapping panel to two
    // pixels above its text (ADV-P16C-A).
    let divider: SeamProps['divider'] = null
    if (shaped && out.length === 0 && hero && !appearance?.inset && ground !== 'image' && !same(hero, ground)) {
      divider = {mode: 'rise', flip: alternates && placed % 2 === 1}
    } else if (shaped && out.length > 0 && strong(ground) && !strong(prevGround) && prevGround && prevGround !== 'image') {
      divider = {mode: 'cut', from: prevGround, flip: alternates && placed % 2 === 1}
    }
    if (divider) {
      seam.divider = divider
      placed++
    }

    // The backward half: the band above an overlapping panel keeps the panel off
    // its content by growing its own bottom padding by the overlap.
    if (overlapping && out.length > 0) {
      const above = out[out.length - 1]
      above.seam = {...above.seam, nextOverlap: overlapOf(appearance)}
    }

    out.push({member, index, seam})
    prevGround = ground
  })

  // THE GHOST goes on ONE band and no more (Phase 16D, `[R-492]`): the studied sites
  // use a median of one per page and a maximum of four, and a rule that fired on every
  // eligible band would draw ten on a client whose homepage runs ten dark sections.
  //
  // It prefers a DARK band, which is where the study's ghosts sit and where a large
  // quiet mark reads; failing that, the first eligible band. Eligible is every ground
  // whose blend with the texture ink `validateWcag` already sweeps — light, tint, muted
  // and dark — and excludes:
  //   saturated and image, where no swept pair exists (6 of 16 shipped palettes and
  //     8.9% of 5,000 seeded ones fail AA on a saturated band, measured);
  //   a Pattern band, because two decorative layers blend past the one the sweep covers;
  //   an inset panel, which is a card, not a ground.
  if (site?.ghost) {
    const eligible = out.filter(({member}) => {
      const a = resolve(member).appearance
      const g = visibleGround(a, site.patternDark)
      return g !== 'saturated' && g !== 'image' && a?.surface !== 'pattern' && !a?.inset
    })
    const host =
      eligible.find(({member}) => visibleGround(resolve(member).appearance, site.patternDark) === 'dark') ??
      eligible[0]
    if (host) host.seam = {...host.seam, ghost: true}
  }

  return out
}
