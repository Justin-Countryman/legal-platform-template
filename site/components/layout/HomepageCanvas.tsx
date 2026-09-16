import {ScrollReveal} from '@/components/ui/ScrollReveal'
import {BadgesBlock, type BadgesBlockData} from '@/components/homepage/BadgesBlock'
import {
  DifferentiatorBlock,
  type DifferentiatorBlockData,
} from '@/components/homepage/DifferentiatorBlock'
import {NarrativeBlock, type NarrativeBlockData} from '@/components/homepage/NarrativeBlock'
import {
  CaseResultsBlock,
  type CaseResultsBlockData,
} from '@/components/homepage/CaseResultsBlock'
import {
  AttorneyHighlightBlock,
  type AttorneyHighlightBlockData,
} from '@/components/homepage/AttorneyHighlightBlock'
import {SiloNavBlock, type SiloNavBlockData} from '@/components/homepage/SiloNavBlock'
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
import {walkFrame, type SeamProps, NO_SEAM} from '@/components/sections/sectionFrame'
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
// PLATFORM-OWNED, and deliberately NOT in `components/homepage/`. This file is
// identical on every client and it carries the first-block motion rule, so a
// client-owned copy forks that rule per client and nothing reports the
// divergence. It sits with the other page-shell primitives (Header, Footer,
// homeHero, InternalHero) because it is one: the structural container for the
// homepage mid-page.
//
// THE LIST IT RENDERS (Phase 10, 2026-09-14; monorepo WS-V1-PHASE10-DESIGN).
// `homePage.canvas` holds two kinds of member for one pin:
//
//   - the eight INLINE SECTION OBJECTS (`<name>Inline`), page-owned copies of
//     the shared sections and the content section (Phase 11), rendered by the same section components interior
//     pages use (`components/sections/`), which take their data as props and
//     carry no `_type`: this switch owns the discriminant;
//   - the six OLD BLOCK TYPES, retired (deprecated in the schema) and rendered
//     through `components/homepage/*Block.tsx` exactly as before, so a dataset
//     nobody has migrated yet renders unchanged. Phase 12 migrates the stored
//     members to the inline types; Phase 15 deletes the six cases, the block
//     components and the schema types. There is no render-time upgrade: an old
//     member is an old member until the migration rewrites it, and the golden
//     in __tests__/HomepageCanvas.parity.test.tsx pins that nothing here moved.
//
// THE CONTRACT WITH THE CLIENT-OWNED SIDE, for the old blocks while they last.
// `components/homepage/` holds block components only, never plumbing. Each
// block ships at a fixed path and export name, so the imports below are stable
// on every client. A client rewrites the MARKUP inside a block file; it never
// renames the file or its export, and it never edits this dispatcher.
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
  | BadgesBlockData
  | DifferentiatorBlockData
  | NarrativeBlockData
  | CaseResultsBlockData
  | AttorneyHighlightBlockData
  | SiloNavBlockData
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
    case 'caseResultsBlock':
      return (
        <CaseResultsBlock data={block} disclaimer={resolveResultsDisclaimer(resultsDisclaimer)} />
      )
    case 'attorneyHighlightBlock':
      return <AttorneyHighlightBlock data={block} />
    case 'narrativeBlock':
      return <NarrativeBlock data={block} napTokens={napTokens} />
    case 'differentiatorBlock':
      return <DifferentiatorBlock data={block} />
    case 'badgesBlock':
      return <BadgesBlock data={block} />
    case 'siloNavBlock':
      return <SiloNavBlock data={block} napTokens={napTokens} />
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
// The six RETIRED block types answer `{appearance: undefined, empty: false}`:
// they carry no appearance field and render their own hardcoded bands, so they
// are opaque light grounds that take no seam and give none. Phase 15 deletes
// them with these rows.
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
      return {appearance: undefined, empty: false}
  }
}

export function HomepageCanvas({
  blocks,
  napTokens,
  resultsDisclaimer,
}: {
  blocks?: HomepageBlock[] | null
  napTokens?: NapTokens | null
  /** Raw siteSettings.resultsDisclaimer. Nullable by design: the resolver
   *  supplies the code constant whenever it is absent or blank. */
  resultsDisclaimer?: string | null
}) {
  if (!blocks || blocks.length === 0) return null

  return (
    <>
      {walkFrame(blocks, frameOf).map(({member, seam}, surviving) => {
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
