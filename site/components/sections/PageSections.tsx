import {type NapTokens} from '@/lib/tokens'
import {TestimonialsGridSection, type TestimonialsGridSectionData} from './TestimonialsGridSection'
import {FeaturedTestimonialSection, type FeaturedTestimonialSectionData} from './FeaturedTestimonialSection'
import {CtaSectionBlock, type CtaSectionBlockData} from './CtaSectionBlock'
import {FaqSectionBlock, type FaqSectionBlockData} from './FaqSectionBlock'
import {BadgesSectionBlock, type BadgesSectionBlockData} from './BadgesSectionBlock'
import {AttorneySectionBlock, type AttorneySectionBlockData} from './AttorneySectionBlock'
import {ReviewsSectionBlock, type ReviewsSectionBlockData} from './ReviewsSectionBlock'
import {VideoSectionBlock, type VideoSectionBlockData} from './VideoSectionBlock'

// ─── Union type ───────────────────────────────────────────────────────────────

export type PageSectionData =
  | TestimonialsGridSectionData
  | FeaturedTestimonialSectionData
  | CtaSectionBlockData
  | FaqSectionBlockData
  | BadgesSectionBlockData
  | AttorneySectionBlockData
  | ReviewsSectionBlockData
  | VideoSectionBlockData

// ─── Component ────────────────────────────────────────────────────────────────

export function PageSections({
  sections,
  napTokens,
}: {
  sections: PageSectionData[]
  napTokens?: NapTokens | null
}) {
  if (!sections || sections.length === 0) return null

  return (
    <>
      {sections.map((section, i) => {
        switch (section._type) {
          case 'testimonialsGrid':
            return <TestimonialsGridSection key={i} data={section} napTokens={napTokens} />
          case 'featuredTestimonial':
            return <FeaturedTestimonialSection key={i} data={section} />
          case 'ctaSection':
            return <CtaSectionBlock key={i} data={section} napTokens={napTokens} />
          case 'faqSection':
            return <FaqSectionBlock key={i} data={section} napTokens={napTokens} />
          case 'badgesSection':
            return <BadgesSectionBlock key={i} data={section} napTokens={napTokens} />
          case 'attorneySection':
            return <AttorneySectionBlock key={i} data={section} napTokens={napTokens} />
          case 'reviewsSection':
            return <ReviewsSectionBlock key={i} data={section} napTokens={napTokens} />
          case 'videoSection':
            return <VideoSectionBlock key={i} data={section} napTokens={napTokens} />
          default:
            return null
        }
      })}
    </>
  )
}
