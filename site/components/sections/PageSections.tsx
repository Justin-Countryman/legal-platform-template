import {type NapTokens} from '@/lib/tokens'
import {TestimonialsGridSection, type TestimonialsGridSectionData} from './TestimonialsGridSection'
import {FeaturedTestimonialSection, type FeaturedTestimonialSectionData} from './FeaturedTestimonialSection'
import {CtaSectionBlock, type CtaSectionBlockData} from './CtaSectionBlock'
import {FaqSectionBlock, type FaqSectionBlockData} from './FaqSectionBlock'
import {BadgesSectionBlock, type BadgesSectionBlockData} from './BadgesSectionBlock'
import {AttorneySectionBlock, type AttorneySectionBlockData} from './AttorneySectionBlock'
import {ReviewsSectionBlock, type ReviewsSectionBlockData} from './ReviewsSectionBlock'
import {VideoSectionBlock, type VideoSectionBlockData} from './VideoSectionBlock'
import {PracticeAreaNavBlock, type PracticeAreaNavBlockData} from './PracticeAreaNavBlock'

// ─── Union type ───────────────────────────────────────────────────────────────
// The discriminant lives HERE, not on the section data types: the same
// component renders the referenced document (this list) and the page-owned
// inline copy (`HomepageCanvas`, under `<name>Inline`), so the data type
// carries no `_type` and each dispatcher names the types it serves
// (Phase 10, 2026-09-14; sectionProps.ts).

export type PageSectionData =
  | ({_type: 'testimonialsGrid'} & TestimonialsGridSectionData)
  | ({_type: 'featuredTestimonial'} & FeaturedTestimonialSectionData)
  | CtaSectionBlockData
  | FaqSectionBlockData
  | ({_type: 'badgesSection'} & BadgesSectionBlockData)
  | ({_type: 'attorneySection'} & AttorneySectionBlockData)
  | ReviewsSectionBlockData
  | ({_type: 'videoSection'} & VideoSectionBlockData)
  | ({_type: 'practiceAreaNav'} & PracticeAreaNavBlockData)

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
            return <FeaturedTestimonialSection key={i} data={section} napTokens={napTokens} />
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
          case 'practiceAreaNav':
            return <PracticeAreaNavBlock key={i} data={section} napTokens={napTokens} />
          default:
            return null
        }
      })}
    </>
  )
}
