import {SectionHeader} from '@/components/ui/SectionHeader'
import {headerLinkOf} from './headerLink'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {AttorneyCard, type AttorneyCardStyle} from './AttorneyCard'
import {AttorneySlider} from './AttorneySlider'
import {SectionShell} from './SectionShell'
import {type SeamProps, NO_SEAM, followSite} from './sectionFrame'
import {type AttorneySectionProps} from './sectionProps'
import {headingFit} from '@/lib/headingFit'
import {cardGridClasses} from './cardGrid'

/** The attorney card styles drawn upright (`AttorneyCard`); 'editorial' is Avatar's old name. */
const UPRIGHT: readonly string[] = ['portrait', 'avatar', 'editorial', 'minimal', 'spotlight', 'cutout']

// ─── Types ────────────────────────────────────────────────────────────────────

// One props type for both renderings; no `_type`, the dispatchers own it. See
// sectionProps.ts.
export type AttorneySectionBlockData = AttorneySectionProps

// ─── Component ────────────────────────────────────────────────────────────────

// ─── The frame (Phase 13) ───────────────────────────────────────────────────
// Exported for the seam walk in `sectionFrame.ts`: the dispatchers need to
// know, before rendering anything, what ground this band will sit on and
// whether it will render at all.

/** The appearance this section will actually render with. */
export function resolveAppearance(data: AttorneySectionBlockData) {
  return data.appearance
}

/** True when this section renders nothing, so the walk skips it and it never
 *  becomes the "previous band" for the one after it (item 312). */
export function isEmpty(data: AttorneySectionBlockData): boolean {
  return (data.attorneys ?? []).filter((a) => a !== null).length === 0
}

export function AttorneySectionBlock({
  data,
  napTokens,
  seam = NO_SEAM,
  scale,
}: {
  data: AttorneySectionBlockData
  napTokens?: NapTokens | null
  seam?: SeamProps
  /** The homepage passes `marketing`: the heading takes the marketing scale, as the content section's does, so every
   *  section on one page draws one heading size (monorepo `[R-641]`). Absent: the interior tier. */
  scale?: 'marketing'
}) {
  let attorneys = (data.attorneys ?? []).filter(Boolean)
  if (data.mode === 'practiceArea' && data.orderedAttorneyIds?.length) {
    const order = new Map(data.orderedAttorneyIds.map((id, i) => [id, i]))
    attorneys = [...attorneys].sort((a, b) => (order.get(a._id) ?? Infinity) - (order.get(b._id) ?? Infinity))
  }
  if (attorneys.length === 0) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const emphasis = resolveTokenString(data.headingEmphasis, napTokens)
  const link = headerLinkOf(data.headerLink, napTokens)
  const description = resolveTokenString(data.description, napTokens)
  // The section's own style where it has one; otherwise the site's (Phase 16B: a
  // style set sets it, `[R-468]`'s continuity rule), otherwise Classic.
  const chosen = followSite(data.cardStyle as string | null | undefined, seam.site?.attorneyCardStyle) as AttorneyCardStyle | null
  // The cut-out card (monorepo `[R-641]`) only where every photo is a transparent cut-out; else the whole section is
  // Portrait, so a row never mixes figures and boxes (the `photosAllOrNone` precedent, `[R-556]`).
  const cardStyle: AttorneyCardStyle | null = chosen === 'cutout' && !attorneys.every((a) => a.photoOpaque === false) ? 'portrait' : chosen
  const isSlider = data.layout === 'slider'
  // The columns follow the count (cardGrid.ts): Classic lies sideways, so four of it go two by two. Only the styles the
  // card draws upright plan four across; anything else, a retired or unknown value included, draws as Classic.
  const grid = cardGridClasses(attorneys.length, UPRIGHT.includes(cardStyle as string) ? 4 : 3)

  return (
    <SectionShell
      appearance={resolveAppearance(data)}
      seam={seam}
    >

      {heading && (
        <SectionHeader emphasis={emphasis} link={link}
          scale={scale}
          tagline={tagline}
          heading={heading}
          fit={headingFit(heading, seam.site?.headingFace)}
          description={description}
          className="mx-auto mb-12 max-w-2xl"
        />
      )}

      {isSlider ? (
        <AttorneySlider attorneys={attorneys} cardStyle={cardStyle} />
      ) : (
        <ul role="list" className={grid.list} aria-label="Attorneys">
          {attorneys.map((attorney, i) => (
            <li key={attorney._id} className={grid.items[i] || undefined}>
              <AttorneyCard attorney={attorney} cardStyle={cardStyle} />
            </li>
          ))}
        </ul>
      )}

    </SectionShell>
  )
}
