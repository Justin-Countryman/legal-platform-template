import {
  type SectionAppearance,
} from '@/components/sections/SectionShell'
import {type VisibleGround, visibleGround} from '@/lib/sectionSurface'
import {raisesPhotos} from '@/lib/overlaps'

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

/** Phase 16E: whether this member can raise a feature photo into the band above.
 *  Only the content section answers true, and only for a `split` layout whose media
 *  renders as an image or a cutout: a video is not raised, and a practice-area band
 *  also has a `split` layout with a different DOM, so the walk asks the member's own
 *  component rather than reading `layout`. */
export type Raisable = {raisesPhoto?: boolean}

/** How far an inset panel rides up over the band above it. */
export type Overlap = 'none' | 'small' | 'large' | 'photo'

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
  /** The site's overlap (Phase 16E, `[R-499]`): `photo` raises one feature photo into
   *  the band above. Optional, because a required member on `SiteLook` puts every test
   *  literal that constructs one red for a field none of them cares about. */
  overlap?: string | null
  /** The site's gradient (Phase 16F): `deep` fades a dark band's ground into the
   *  deep stop the engine derived. Optional, which is the 16D trap. */
  gradient?: string | null
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
    overlap: s('sectionOverlap'),
    gradient: s('sectionGradient'),
  }
}

/** Interior pages are always a clean ground and never draw a divider (`[R-472]`): they
 *  keep the cards, frames and carried pieces, not the homepage's dividers, texture or
 *  ghost. The drop cap and the quote mark DO reach them: they are the UI system's one
 *  decision each, as the card style and the photo frame are (Phase 16B amendment 25). */
export function interiorLook(site: SiteLook | null | undefined): SiteLook | null {
  return site ? {...site, sectionJoin: 'straight', patternDark: false, ghost: null, overlap: null, gradient: null} : null
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
  /** This band raises its feature photo into the band above (Phase 16E). At most one
   *  band on a page does. */
  raisePhoto?: boolean
  /** The ground an INSET band's own `<section>` paints (Phase 16F). Normally an inset
   *  band paints nothing and the page's light ground runs around its panel; where the
   *  band above and the band below both show one strong ground, the panel sits ON that
   *  ground instead, so the run reads as one block of color. Null everywhere else. */
  insetGround?: VisibleGround | null
  /** This band's place in its run of one visible ground (Phase 16F): `index` from 0 and
   *  `length` the run's size, so a gradient can be sliced across the run. A band that
   *  stands alone is a run of one and takes the whole ramp, which is the per-band device
   *  the field study and the live census both record. */
  run?: {index: number; length: number}
}

export const NO_SEAM: SeamProps = {site: null, seamTop: false, previousGround: null, nextOverlap: 'none', divider: null, ghost: false, raisePhoto: false, insetGround: null}

/** Overlap applies to an inset panel only (Phase 16A, `[R-475]`): a full-width band
 *  riding over the one above only hid that band's bottom, text included. */
export function overlapOf(appearance: SectionAppearance | null | undefined): Overlap {
  return appearance?.inset ? (appearance.overlapPrevious ?? 'none') : 'none'
}

/** Which grounds an inset panel may sit on. Dark and saturated only: those are the
 *  two the page ground contrasts with, and they are the two a panel reads as a figure
 *  against. A panel on a light run is invisible -- it already sits on light. */
const HOSTS: readonly VisibleGround[] = ['dark', 'saturated']

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
  resolve: (member: M) => {appearance: SectionAppearance | null | undefined; empty: boolean} & Raisable,
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

  // ─── The adoption pass (Phase 16F) ──────────────────────────────────────────
  // An inset band's `visibleGround` is `light` unconditionally, because the page
  // ground runs around its panel on all four sides. That is right on a light page
  // and wrong inside a run of dark bands: measured on the fixture, it puts 683px of
  // white between two navy bands with a near-white panel floating on it.
  //
  // So BEFORE the walk numbers anything, an inset band bracketed above and below by
  // one strong ground adopts it. It has to be decided here rather than inside the
  // loop, because it needs the band BELOW and the forward walk does not have it --
  // and because everything downstream reads the ground: the seam, the divider (which
  // would otherwise cut a light wedge into an already-dark band), the ghost and the
  // raised photo.
  const survivors = members.map((m, index) => ({m, index, ...resolve(m)})).filter((r) => !r.empty)
  const raw = survivors.map((r) => visibleGround(r.appearance, site?.patternDark))
  const adopted: (VisibleGround | null)[] = survivors.map((r, i) => {
    if (!r.appearance?.inset) return null
    if (i === 0 || i === survivors.length - 1) return null
    const above = raw[i - 1]
    const below = raw[i + 1]
    return above === below && HOSTS.includes(above) ? above : null
  })
  const groundAt = new Map<number, VisibleGround>()
  const adoptAt = new Map<number, VisibleGround>()
  survivors.forEach((r, i) => {
    groundAt.set(r.index, adopted[i] ?? raw[i])
    if (adopted[i]) adoptAt.set(r.index, adopted[i]!)
  })

  members.forEach((member, index) => {
    const {appearance, empty} = resolve(member)
    // An invisible band leaves the previous ground untouched, so the band after
    // it seams against the last band anyone can actually see.
    if (empty) return

    const ground = groundAt.get(index) ?? visibleGround(appearance, site?.patternDark)

    // An overlapping panel takes no top padding from `md`, so a seam would be
    // meaningless; `SectionShell` already resolves that, and asking for both
    // here would be a contradiction rather than a refinement.
    const overlapping = overlapOf(appearance) !== 'none'

    const seam: SeamProps =
      out.length === 0
        ? {...NO_SEAM, site, insetGround: adoptAt.get(index) ?? null}
        : {
            site,
            seamTop: !overlapping && prevGround === ground,
            previousGround: prevGround,
            nextOverlap: 'none',
            insetGround: adoptAt.get(index) ?? null,
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
      const g = groundAt.get(out.find((o) => o.member === member)!.index) ?? visibleGround(a, site.patternDark)
      return g !== 'saturated' && g !== 'image' && a?.surface !== 'pattern' && !a?.inset
    })
    const host =
      eligible.find(({member}) => visibleGround(resolve(member).appearance, site.patternDark) === 'dark') ??
      eligible[0]
    if (host) host.seam = {...host.seam, ghost: true}
  }

  // THE RAISED PHOTO (Phase 16E). One band per page, as the study's sites do: a median
  // of one mid-page overlap and a maximum of two, against two to four eligible bands on
  // an ordinary canvas. Eligible is a content section whose `split` media renders as a
  // photo, that is not the first band (nothing above it), that is not an inset panel
  // (the panel's own `overflow-hidden` cuts the photo dead flat, measured), and whose
  // band above shows a different ground, where light and tint count as one exactly as
  // the divider counts them.
  if (site && raisesPhotos(site.overlap)) {
    const eligible: number[] = []
    for (let i = 1; i < out.length; i++) {
      const r = resolve(out[i].member)
      if (!r.raisesPhoto || r.appearance?.inset) continue
      const g = groundAt.get(out[i].index) ?? visibleGround(r.appearance, site.patternDark)
      const prev = groundAt.get(out[i - 1].index) ?? visibleGround(resolve(out[i - 1].member).appearance, site.patternDark)
      if (!same(g, prev)) eligible.push(i)
    }
    // NEAREST THE MIDDLE OF THE LIST, never the first: live, the first ground-change
    // band holds 1 of 35 rising overlaps, and the median normalised position is 0.50
    // with 18 of 35 in the middle third (ADV-16E-B). A tie takes the earlier band.
    const mid = (out.length - 1) / 2
    const pick = eligible.reduce<number | null>(
      (best, i) => (best === null || Math.abs(i - mid) < Math.abs(best - mid) ? i : best), null)
    if (pick !== null) {
      out[pick].seam = {...out[pick].seam, raisePhoto: true}
      out[pick - 1].seam = {...out[pick - 1].seam, nextOverlap: 'photo'}
    }
  }

  // ─── The run pass (Phase 16F) ───────────────────────────────────────────────
  // Number each maximal stretch of survivors sharing one visible ground, AFTER the
  // adoption pass, so an adopted inset band is inside its run rather than breaking it.
  {
    let start = 0
    for (let i = 1; i <= out.length; i++) {
      const same2 = i < out.length && groundAt.get(out[i].index) === groundAt.get(out[start].index)
      if (!same2) {
        const length = i - start
        for (let k = start; k < i; k++) out[k].seam = {...out[k].seam, run: {index: k - start, length}}
        start = i
      }
    }
  }

  return out
}
