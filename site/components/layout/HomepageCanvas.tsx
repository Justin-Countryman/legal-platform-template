import {ScrollReveal} from '@/components/ui/ScrollReveal'
import {PracticeAreaNavBlock, type PracticeAreaNavBlockData} from '@/components/sections/PracticeAreaNavBlock'
import {AttorneySectionBlock, type AttorneySectionBlockData} from '@/components/sections/AttorneySectionBlock'
import {BadgesSectionBlock, type BadgesSectionBlockData} from '@/components/sections/BadgesSectionBlock'
import {TestimonialsGridSection, type TestimonialsGridSectionData} from '@/components/sections/TestimonialsGridSection'
import {FeaturedTestimonialSection, type FeaturedTestimonialSectionData} from '@/components/sections/FeaturedTestimonialSection'
import {VideoSectionBlock, type VideoSectionBlockData} from '@/components/sections/VideoSectionBlock'
import {CaseResultsSection, type CaseResultsSectionData} from '@/components/sections/CaseResultsSection'
import {ContentSectionBlock, isContentSectionEmpty, type ContentSectionData} from '@/components/sections/ContentSectionBlock'
import {ReviewsSectionBlock, type ReviewsSectionBlockData} from '@/components/sections/ReviewsSectionBlock'
import {resolveResultsDisclaimer} from '@/lib/legal'
import {type NapTokens} from '@/lib/tokens'
import {type SectionAppearance} from '@/components/sections/SectionShell'
import {walkFrame, type SeamProps, type SiteLook, NO_SEAM} from '@/components/sections/sectionFrame'
import * as AttorneyFrame from '@/components/sections/AttorneySectionBlock'
import * as BadgesFrame from '@/components/sections/BadgesSectionBlock'
import * as CaseResultsFrame from '@/components/sections/CaseResultsSection'
import * as ContentFrame from '@/components/sections/ContentSectionBlock'
import * as FeaturedFrame from '@/components/sections/FeaturedTestimonialSection'
import * as PracticeAreaFrame from '@/components/sections/PracticeAreaNavBlock'
import * as ReviewsFrame from '@/components/sections/ReviewsSectionBlock'
import * as TestimonialsFrame from '@/components/sections/TestimonialsGridSection'
import * as VideoFrame from '@/components/sections/VideoSectionBlock'

// ─── Homepage canvas ──────────────────────────────────────────────────────────
//
// Renders the composed mid-page: the ordered blocks between the hero primitive
// and the footer primitive.
//
// PLATFORM-OWNED. This file is identical on every client and it carries the
// first-block motion rule. It sits with the other page-shell primitives (Header,
// Footer, homeHero, InternalHero) because it is one: the structural container
// for the homepage mid-page.
//
// THE LIST IT RENDERS. `homePage.canvas` holds the nine INLINE SECTION OBJECTS
// (`<name>Inline`), page-owned copies of the shared sections and the content
// section, rendered by the same section components interior pages use
// (`components/sections/`), which take their data as props and carry no
// `_type`: this switch owns the discriminant. The six old block types that
// shared the list from Phase 10 to Phase 15 are deleted (monorepo
// WS-V1-PHASE15-DESIGN §7 amendment 1); a stored member of a deleted or unknown
// type renders nothing, and the golden in __tests__/HomepageCanvas.parity.test.tsx
// pins what a migrated canvas renders.
//
// THIS IS NOT PageSections. PageSections renders the interior-page section
// system, which produces fixed stacked bands and forbids crossing between them.
// That is correct for interior pages and is exactly what stops a homepage
// flowing, so the homepage gets its own renderer.
//
// ─── Where the first-block rule is enforced ───────────────────────────────────
//
// Scroll reveal is default for mid-page blocks, and NEVER for the hero or the
// first block after it. Nothing there should be arriving: motion on content
// already on screen at load reads as a glitch.
//
// ScrollReveal cannot enforce the first-block half itself. It only touches
// content below the fold, which handles the hero, but a short viewport can push
// the first block below the fold where the primitive would happily animate it.
// The rule is therefore applied HERE, by index, which is the only place that
// knows a block's position. A block cannot know whether it is first, which is
// also why blocks do not wrap themselves.
type InlineMember<T extends string, D> = {_type: T; _key: string} & D

export type HomepageBlock =
  | InlineMember<'practiceAreaNavInline', PracticeAreaNavBlockData>
  | InlineMember<'attorneySectionInline', AttorneySectionBlockData>
  | InlineMember<'badgesSectionInline', BadgesSectionBlockData>
  | InlineMember<'testimonialsGridInline', TestimonialsGridSectionData>
  | InlineMember<'featuredTestimonialInline', FeaturedTestimonialSectionData>
  | InlineMember<'videoSectionInline', VideoSectionBlockData>
  | InlineMember<'caseResultsSectionInline', CaseResultsSectionData>
  | InlineMember<'contentSectionInline', ContentSectionData>
  | InlineMember<'reviewsSectionInline', ReviewsSectionBlockData>

// The disclaimer is resolved HERE, not in the block, and passed as a required
// prop. Bar advertising rules require past results to be paired with a
// disclaimer, always, and the guarantee has to sit somewhere a client rewriting
// its own block markup cannot reach. `resolveResultsDisclaimer` returns a
// non-empty string for every possible input, so the block receives a value it
// can render unconditionally and has no nullable case to get wrong.
function renderBlock(
  block: HomepageBlock,
  napTokens?: NapTokens | null,
  resultsDisclaimer?: string | null,
  seam: SeamProps = NO_SEAM,
) {
  switch (block._type) {
    // The inline section objects: the shared section components, the same ones
    // PageSections renders for the referenced documents.
    case 'practiceAreaNavInline':
      return <PracticeAreaNavBlock data={block} napTokens={napTokens} seam={seam} />
    case 'attorneySectionInline':
      return <AttorneySectionBlock data={block} napTokens={napTokens} seam={seam} />
    case 'badgesSectionInline':
      return <BadgesSectionBlock data={block} napTokens={napTokens} seam={seam} />
    case 'testimonialsGridInline':
      return <TestimonialsGridSection data={block} napTokens={napTokens} seam={seam} />
    case 'featuredTestimonialInline':
      return <FeaturedTestimonialSection data={block} napTokens={napTokens} seam={seam} />
    case 'videoSectionInline':
      return <VideoSectionBlock data={block} napTokens={napTokens} seam={seam} />
    case 'caseResultsSectionInline':
      return (
        <CaseResultsSection
          data={block}
          disclaimer={resolveResultsDisclaimer(resultsDisclaimer)}
          napTokens={napTokens}
          seam={seam}
        />
      )
    // Emptiness is decided HERE, so an empty member returns null to the map
    // below and gets no ScrollReveal wrapper. The disclaimer is resolved here
    // for the same reason as case results': the component cannot skip it.
    case 'contentSectionInline':
      return (
        <ContentSectionBlock
          data={block}
          disclaimer={resolveResultsDisclaimer(resultsDisclaimer)}
          napTokens={napTokens}
          scale="marketing"
          seam={seam}
        />
      )
    // A reviews band is its embed: none, no band, and no ScrollReveal wrapper.
    case 'reviewsSectionInline':
      return <ReviewsSectionBlock data={block} napTokens={napTokens} seam={seam} />
    // No default case that renders something generic. An unknown block type
    // renders nothing rather than a placeholder: a block added to the schema
    // and not to this switch should be invisible, not half-drawn.
    default:
      return null
  }
}

// ─── The frame, per member type ───────────────────────────────────────────────
//
// What the walk needs from each member before anything renders: the appearance
// it WILL use, and whether it will render at all. Both come from the component
// that owns the answer, never from the stored value (see sectionFrame.ts).
//
// A member whose type this switch does not know renders nothing (see
// `renderBlock`), so the walk must count it as empty too. Answering
// `empty: false` made an unknown member at index 0 the "previous band": the
// first real band lost its full top padding to a seam and gained a ScrollReveal
// wrapper against the first-band rule (measured, Phase 15 challenge). Before
// Phase 15 the six retired block types also fell here and did render; they are
// deleted, so only an unknown type reaches `default` now.
function frameOf(block: HomepageBlock): {appearance: SectionAppearance | null | undefined; empty: boolean} {
  switch (block._type) {
    case 'practiceAreaNavInline':
      return {appearance: PracticeAreaFrame.resolveAppearance(block), empty: PracticeAreaFrame.isEmpty(block)}
    case 'attorneySectionInline':
      return {appearance: AttorneyFrame.resolveAppearance(block), empty: AttorneyFrame.isEmpty(block)}
    case 'badgesSectionInline':
      return {appearance: BadgesFrame.resolveAppearance(block), empty: BadgesFrame.isEmpty(block)}
    case 'testimonialsGridInline':
      return {appearance: TestimonialsFrame.resolveAppearance(block), empty: TestimonialsFrame.isEmpty(block)}
    case 'featuredTestimonialInline':
      return {appearance: FeaturedFrame.resolveAppearance(block), empty: FeaturedFrame.isEmpty(block)}
    case 'videoSectionInline':
      return {appearance: VideoFrame.resolveAppearance(block), empty: VideoFrame.isEmpty(block)}
    case 'caseResultsSectionInline':
      return {appearance: CaseResultsFrame.resolveAppearance(block), empty: CaseResultsFrame.isEmpty(block)}
    case 'contentSectionInline':
      return {appearance: ContentFrame.resolveAppearance(block), empty: isContentSectionEmpty(block)}
    case 'reviewsSectionInline':
      return {appearance: ReviewsFrame.resolveAppearance(block), empty: ReviewsFrame.isEmpty(block)}
    default:
      return {appearance: undefined, empty: true}
  }
}

export function HomepageCanvas({
  blocks,
  napTokens,
  resultsDisclaimer,
  site,
}: {
  blocks?: HomepageBlock[] | null
  napTokens?: NapTokens | null
  /** The site's look from Design Settings (`siteLookOf`), carried to every band on
   *  its seam (Phase 16B). Absent renders every default. */
  site?: SiteLook | null
  /** Raw siteSettings.resultsDisclaimer. Nullable by design: the resolver
   *  supplies the code constant whenever it is absent or blank. */
  resultsDisclaimer?: string | null
}) {
  if (!blocks || blocks.length === 0) return null

  return (
    <>
      {walkFrame(blocks, frameOf, site ?? null).map(({member, seam}, surviving) => {
        const rendered = renderBlock(member, napTokens, resultsDisclaimer, seam)
        if (!rendered) return null
        // THE FIRST SURVIVING BAND, not the member at index 0. `i === 0` on the
        // stored index was a live bug: an empty section at index 0 was nulled
        // AFTER this test, so the first band a visitor actually sees was handed a
        // ScrollReveal wrapper, against the rule the header above calls
        // load-bearing. The walk has already dropped the empties, so
        // `surviving === 0` is the first visible band by construction.
        return surviving === 0 ? (
          <div key={member._key}>{rendered}</div>
        ) : (
          <ScrollReveal key={member._key}>{rendered}</ScrollReveal>
        )
      })}
    </>
  )
}
