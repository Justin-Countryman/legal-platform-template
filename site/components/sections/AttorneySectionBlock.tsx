import {SectionHeader} from '@/components/ui/SectionHeader'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {AttorneyCard, type AttorneyCardStyle} from './AttorneyCard'
import {type AttorneyCard as AttorneyCardData} from './AttorneyCardParts'
import {AttorneySlider} from './AttorneySlider'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttorneySectionBlockData = {
  _type: 'attorneySection'
  tagline?: string | null
  heading?: string | null
  description?: string | null
  mode?: 'practiceArea' | 'manual' | 'all' | null
  layout?: 'grid' | 'slider' | null
  cardStyle?: AttorneyCardStyle | null
  attorneys?: AttorneyCardData[] | null
  orderedAttorneyIds?: string[] | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AttorneySectionBlock({
  data,
  napTokens,
}: {
  data: AttorneySectionBlockData
  napTokens?: NapTokens | null
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
    <section className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container">

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

      </div>
    </section>
  )
}
