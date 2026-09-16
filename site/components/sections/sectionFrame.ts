import {
  type SectionAppearance,
} from '@/components/sections/SectionShell'
import {type SectionEdge, type VisibleGround, edgeCancelsSeam, visibleGround} from '@/lib/sectionSurface'

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
// resolved by the dispatcher and handed down as a prop. Phase 16's
// `surfaceRhythm` becomes the second argument to `resolveAppearance` and is
// threaded as one `siteFrameDefaults` prop per dispatcher.

/** What a section component must export so the walk can see it.
 *
 *  `resolveAppearance` returns the appearance the component WILL render with,
 *  including any default it applies itself. `isEmpty` is true when the component
 *  will render nothing. */
export type FrameResolver<T> = {
  resolveAppearance: (data: T) => SectionAppearance | null | undefined
  isEmpty: (data: T) => boolean
}

/** Per-band frame props the dispatcher passes into `SectionShell`. */
export type SeamProps = {
  seamTop: boolean
  previousGround: VisibleGround | null
  previousEdge: SectionEdge | null
}

export const NO_SEAM: SeamProps = {seamTop: false, previousGround: null, previousEdge: null}

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
): Array<{member: M; index: number; seam: SeamProps}> {
  const out: Array<{member: M; index: number; seam: SeamProps}> = []
  let prevGround: VisibleGround | null = null
  let prevEdge: SectionEdge | null = null

  members.forEach((member, index) => {
    const {appearance, empty} = resolve(member)
    // An invisible band leaves the previous ground untouched, so the band after
    // it seams against the last band anyone can actually see.
    if (empty) return

    const ground = visibleGround(appearance)
    const edge = appearance?.edgeBottom ?? null
    // An overlapping band takes no top padding at all, so a seam would be
    // meaningless; `SectionShell` already resolves that, and asking for both
    // here would be a contradiction rather than a refinement.
    const overlapping = (appearance?.overlapPrevious ?? 'none') !== 'none'

    const seam: SeamProps =
      out.length === 0
        ? NO_SEAM
        : {
            seamTop: !overlapping && !edgeCancelsSeam(prevGround, prevEdge) && prevGround === ground,
            previousGround: prevGround,
            previousEdge: prevEdge,
          }

    out.push({member, index, seam})
    prevGround = ground
    prevEdge = edge
  })

  return out
}
