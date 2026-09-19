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
import {walkFrame, interiorLook, type SiteLook} from './sectionFrame'
import {type SectionAppearance} from './SectionShell'
import * as AttorneyFrame from './AttorneySectionBlock'
import * as BadgesFrame from './BadgesSectionBlock'
import * as CaseResultsFrame from './CaseResultsSection'
import * as ContentFrame from './ContentSectionBlock'
import * as CtaFrame from './CtaSectionBlock'
import * as FaqFrame from './FaqSectionBlock'
import * as FeaturedFrame from './FeaturedTestimonialSection'
import * as PracticeAreaFrame from './PracticeAreaNavBlock'
import * as ReviewsFrame from './ReviewsSectionBlock'
import * as TestimonialsFrame from './TestimonialsGridSection'
import * as VideoFrame from './VideoSectionBlock'

// ─── The frame, per section type ──────────────────────────────────────────────
// The same contract `HomepageCanvas` uses. `PageSections` wraps nothing in
// `ScrollReveal`, so an empty section here left no stray div — but it did still
// become the "previous band" for the one after it, which is the half of item 312
// that applies to interior pages.
function frameOf(section: PageSectionData): {appearance: SectionAppearance | null | undefined; empty: boolean} {
  switch (section._type) {
    case 'practiceAreaNav':
      return {appearance: PracticeAreaFrame.resolveAppearance(section), empty: PracticeAreaFrame.isEmpty(section)}
    case 'attorneySection':
      return {appearance: AttorneyFrame.resolveAppearance(section), empty: AttorneyFrame.isEmpty(section)}
    case 'badgesSection':
      return {appearance: BadgesFrame.resolveAppearance(section), empty: BadgesFrame.isEmpty(section)}
    case 'testimonialsGrid':
      return {appearance: TestimonialsFrame.resolveAppearance(section), empty: TestimonialsFrame.isEmpty(section)}
    case 'featuredTestimonial':
      return {appearance: FeaturedFrame.resolveAppearance(section), empty: FeaturedFrame.isEmpty(section)}
    case 'videoSection':
      return {appearance: VideoFrame.resolveAppearance(section), empty: VideoFrame.isEmpty(section)}
    case 'caseResultsSection':
      return {appearance: CaseResultsFrame.resolveAppearance(section), empty: CaseResultsFrame.isEmpty(section)}
    case 'contentSection':
      return {appearance: ContentFrame.resolveAppearance(section), empty: isContentSectionEmpty(section)}
    case 'reviewsSection':
      return {appearance: ReviewsFrame.resolveAppearance(section), empty: ReviewsFrame.isEmpty(section)}
    case 'ctaSection':
      return {appearance: CtaFrame.resolveAppearance(section), empty: CtaFrame.isEmpty(section)}
    case 'faqSection':
      return {appearance: FaqFrame.resolveAppearance(section), empty: FaqFrame.isEmpty(section)}
    default:
      return {appearance: undefined, empty: false}
  }
}

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
  | ({_type: 'reviewsSection'} & ReviewsSectionBlockData)
  | ({_type: 'videoSection'} & VideoSectionBlockData)
  | ({_type: 'practiceAreaNav'} & PracticeAreaNavBlockData)
  | ({_type: 'contentSection'} & ContentSectionData)
  | ({_type: 'caseResultsSection'} & CaseResultsSectionData)

// ─── Interior pages never wear a texture ──────────────────────────────────────
// `[R-472]`: interior pages are always a clean ground, and a texture appears only
// on a HOMEPAGE section someone set to Pattern. The Studio no longer offers
// Pattern on these section documents (Phase 16A); this renders a `pattern` stored
// before then as `light`, which is the same ground without the texture.
function withoutTexture(section: PageSectionData): PageSectionData {
  const appearance = (section as {appearance?: SectionAppearance | null}).appearance
  return appearance?.surface === 'pattern'
    ? ({...section, appearance: {...appearance, surface: 'light'}} as PageSectionData)
    : section
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PageSections({
  sections,
  napTokens,
  resultsDisclaimer,
  site,
}: {
  sections: PageSectionData[]
  napTokens?: NapTokens | null
  /** The site's look (`siteLookOf`). Interior pages take its cards and frames but
   *  never a join or a textured ground (`interiorLook`, Phase 16B). */
  site?: SiteLook | null
  /** Raw siteSettings.resultsDisclaimer, projected by the page query. Nullable
   *  by design: the resolver supplies the code constant when it is absent. */
  resultsDisclaimer?: string | null
}) {
  if (!sections || sections.length === 0) return null

  return (
    <>
      {walkFrame(sections.map(withoutTexture), frameOf, interiorLook(site)).map(({member: section, index: i, seam}) => {
        switch (section._type) {
          case 'testimonialsGrid':
            return <TestimonialsGridSection key={i} data={section} napTokens={napTokens} seam={seam} />
          case 'featuredTestimonial':
            return <FeaturedTestimonialSection key={i} data={section} napTokens={napTokens} seam={seam} />
          case 'ctaSection':
            return <CtaSectionBlock key={i} data={section} napTokens={napTokens} seam={seam} />
          case 'faqSection':
            return <FaqSectionBlock key={i} data={section} napTokens={napTokens} seam={seam} />
          case 'badgesSection':
            return <BadgesSectionBlock key={i} data={section} napTokens={napTokens} seam={seam} />
          case 'attorneySection':
            return <AttorneySectionBlock key={i} data={section} napTokens={napTokens} seam={seam} />
          case 'reviewsSection':
            return <ReviewsSectionBlock key={i} data={section} napTokens={napTokens} seam={seam} />
          case 'videoSection':
            return <VideoSectionBlock key={i} data={section} napTokens={napTokens} seam={seam} />
          case 'practiceAreaNav':
            return <PracticeAreaNavBlock key={i} data={section} napTokens={napTokens} seam={seam} />
          // Phase 11: the two documents an interior list can now reference. Both
          // take the results disclaimer, resolved here, never by the component.
          case 'contentSection':
            return (
              <ContentSectionBlock key={i} data={section} disclaimer={resolveResultsDisclaimer(resultsDisclaimer)} napTokens={napTokens} scale="interior" seam={seam} />
            )
          case 'caseResultsSection':
            return <CaseResultsSection key={i} data={section} disclaimer={resolveResultsDisclaimer(resultsDisclaimer)} napTokens={napTokens} seam={seam} />
          default:
            return null
        }
      })}
    </>
  )
}
