import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {HtmlEmbed} from '@/components/ui/HtmlEmbed'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewsSectionBlockData = {
  _type: 'reviewsSection'
  tagline?: string | null
  heading?: string | null
  description?: string | null
  reviewsEmbed?: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewsSectionBlock({
  data,
  napTokens,
}: {
  data: ReviewsSectionBlockData
  napTokens?: NapTokens | null
}) {
  if (!data.reviewsEmbed) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const description = resolveTokenString(data.description, napTokens)

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

        <HtmlEmbed html={data.reviewsEmbed} />

      </div>
    </section>
  )
}
