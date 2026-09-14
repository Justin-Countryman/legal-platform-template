import {type NapTokens} from '@/lib/tokens'
import {resolveResultsDisclaimer} from '@/lib/legal'
import {CaseResultsSection, type CaseResultsSectionData} from './CaseResultsSection'
import {ContentSectionBlock, isContentSectionEmpty, type ContentSectionData} from './ContentSectionBlock'
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
  | ({_type: 'contentSection'} & ContentSectionData)
  | ({_type: 'caseResultsSection'} & CaseResultsSectionData)

// ─── Component ────────────────────────────────────────────────────────────────

export function PageSections({
  sections,
  napTokens,
  resultsDisclaimer,
}: {
  sections: PageSectionData[]
  napTokens?: NapTokens | null
  /** Raw siteSettings.resultsDisclaimer, projected by the page query. Nullable
   *  by design: the resolver supplies the code constant when it is absent. */
  resultsDisclaimer?: string | null
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
          // Phase 11: the two documents an interior list can now reference. Both
          // take the results disclaimer, resolved here, never by the component.
          case 'contentSection':
            return isContentSectionEmpty(section) ? null : (
              <ContentSectionBlock key={i} data={section} disclaimer={resolveResultsDisclaimer(resultsDisclaimer)} napTokens={napTokens} scale="interior" />
            )
          case 'caseResultsSection':
            return <CaseResultsSection key={i} data={section} disclaimer={resolveResultsDisclaimer(resultsDisclaimer)} napTokens={napTokens} />
          default:
            return null
        }
      })}
    </>
  )
}
