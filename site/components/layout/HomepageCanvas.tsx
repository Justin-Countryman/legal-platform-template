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
import {resolveResultsDisclaimer} from '@/lib/legal'
import {type NapTokens} from '@/lib/tokens'

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
//   - the seven INLINE SECTION OBJECTS (`<name>Inline`), page-owned copies of
//     the shared sections, rendered by the same section components interior
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
      return <PracticeAreaNavBlock data={block} napTokens={napTokens} />
    case 'attorneySectionInline':
      return <AttorneySectionBlock data={block} napTokens={napTokens} />
    case 'badgesSectionInline':
      return <BadgesSectionBlock data={block} napTokens={napTokens} />
    case 'testimonialsGridInline':
      return <TestimonialsGridSection data={block} napTokens={napTokens} />
    case 'featuredTestimonialInline':
      return <FeaturedTestimonialSection data={block} napTokens={napTokens} />
    case 'videoSectionInline':
      return <VideoSectionBlock data={block} napTokens={napTokens} />
    case 'caseResultsSectionInline':
      return (
        <CaseResultsSection
          data={block}
          disclaimer={resolveResultsDisclaimer(resultsDisclaimer)}
          napTokens={napTokens}
        />
      )
    // No default case that renders something generic. An unknown block type
    // renders nothing rather than a placeholder: a block added to the schema
    // and not to this switch should be invisible, not half-drawn.
    default:
      return null
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
      {blocks.map((block, i) => {
        const rendered = renderBlock(block, napTokens, resultsDisclaimer)
        if (!rendered) return null
        // Index 0 is the first block after the hero: no motion, ever.
        return i === 0 ? (
          <div key={block._key}>{rendered}</div>
        ) : (
          <ScrollReveal key={block._key}>{rendered}</ScrollReveal>
        )
      })}
    </>
  )
}
