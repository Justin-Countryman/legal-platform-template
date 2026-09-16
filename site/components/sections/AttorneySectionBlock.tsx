import {SectionHeader} from '@/components/ui/SectionHeader'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {AttorneyCard} from './AttorneyCard'
import {AttorneySlider} from './AttorneySlider'
import {SectionShell} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import {type AttorneySectionProps} from './sectionProps'

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
}: {
  data: AttorneySectionBlockData
  napTokens?: NapTokens | null
  seam?: SeamProps
}) {
  let attorneys = (data.attorneys ?? []).filter(Boolean)
  if (data.mode === 'practiceArea' && data.orderedAttorneyIds?.length) {
    const order = new Map(data.orderedAttorneyIds.map((id, i) => [id, i]))
    attorneys = [...attorneys].sort((a, b) => (order.get(a._id) ?? Infinity) - (order.get(b._id) ?? Infinity))
  }
  if (attorneys.length === 0) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const description = resolveTokenString(data.description, napTokens)
  const cardStyle = data.cardStyle
  const isSlider = data.layout === 'slider'

  return (
    <SectionShell
      appearance={resolveAppearance(data)}
      seamTop={seam.seamTop}
      previousGround={seam.previousGround}
      previousEdge={seam.previousEdge}
    >

      {heading && (
        <SectionHeader
          tagline={tagline}
          heading={heading}
          description={description}
          className="mx-auto mb-12 max-w-2xl"
        />
      )}

      {isSlider ? (
        <AttorneySlider attorneys={attorneys} cardStyle={cardStyle} />
      ) : (
        <ul role="list" className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-label="Attorneys">
          {attorneys.map((attorney) => (
            <li key={attorney._id}>
              <AttorneyCard attorney={attorney} cardStyle={cardStyle} />
            </li>
          ))}
        </ul>
      )}

    </SectionShell>
  )
}
