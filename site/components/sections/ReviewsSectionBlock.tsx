import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {HtmlEmbed} from '@/components/ui/HtmlEmbed'
import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'
import {type ReviewsSectionProps} from './sectionProps'

// ─── Types ────────────────────────────────────────────────────────────────────
//
// One props type for the referenced document (interior `sections` lists) and
// the page-owned copy on the homepage list (`reviewsSectionInline`); the
// dispatchers own `_type` (sectionProps.ts).

export type ReviewsSectionBlockData = ReviewsSectionProps

// ─── Component ────────────────────────────────────────────────────────────────
//
// Three shapes. With no layout and no buttons the markup is exactly what this
// section has always rendered (SectionHeader.golden.test.tsx pins it), so an
// existing reviews section on an interior page does not move. Stacked with
// buttons adds a centred button row between the heading and the widget. Split
// puts the heading, description and buttons in a left column and the widget on
// the right from tablet width up.

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
  const buttons = toCtaItems(data.buttons)
    .slice(0, 2)
    .map((item) => ({...item, label: resolveTokenString(item.label, napTokens)}))

  if (data.layout === 'split') {
    return (
      <section className="px-[5%] py-16 md:py-24 lg:py-28">
        <div className="container">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              {heading && (
                <SectionHeader tagline={tagline} heading={heading} description={description} alignment="left" className="mb-6" />
              )}
              {buttons.length > 0 && <ButtonGroup items={buttons} />}
            </div>
            <div className="md:col-span-7">
              <HtmlEmbed html={data.reviewsEmbed} aria-label={heading || 'Reviews'} />
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (buttons.length > 0) {
    return (
      <section className="px-[5%] py-16 md:py-24 lg:py-28">
        <div className="container">
          {heading && (
            <SectionHeader tagline={tagline} heading={heading} description={description} className="mx-auto mb-6 max-w-2xl" />
          )}
          <ButtonGroup items={buttons} align="center" className="mb-12" />
          <HtmlEmbed html={data.reviewsEmbed} />
        </div>
      </section>
    )
  }

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
