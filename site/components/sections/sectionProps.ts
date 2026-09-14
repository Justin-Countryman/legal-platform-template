import type {
  AttorneySection,
  AttorneySectionInline,
  BadgesSection,
  BadgesSectionInline,
  CaseResultsSectionInline,
  FeaturedTestimonial,
  FeaturedTestimonialInline,
  PracticeAreaNav,
  PracticeAreaNavInline,
  TestimonialsGrid,
  TestimonialsGridInline,
  VideoSection,
  VideoSectionInline,
} from '@/types/sanity.types'
import type {SectionAppearance} from './SectionShell'
import type {SiloNavItem} from './silo/types'
import type {AttorneyCard} from './AttorneyCardParts'
import type {TestimonialData} from '@/components/ui/TestimonialCard'
import type {VideoItem} from '@/components/media/VideoEmbed'

// ─── One props type per shared section ────────────────────────────────────────
//
// Phase 10 (2026-09-14; monorepo WS-V1-PHASE10-DESIGN §2 requirement 8, as
// amended by ADV-P10 and ADV-P10B). Each shared section renders in two places:
// from `homePage.canvas` as the page-owned inline object (`<name>Inline`) and
// from an interior page's `sections` list as the referenced document. One
// component serves both, so it takes ONE props type, derived here from the
// generated DOCUMENT type, which is the superset (the inline copy narrows
// `attorneySection.mode` and drops `name` and `practiceAreaPage`).
//
// What is derived and what is not, stated plainly: the scalar and option-list
// fields (`heading`, `layout`, `mode`, `cardStyle`, ...) come from the
// generated type, nullable-mapped because GROQ returns `null` where the schema
// type says `undefined`. Every key GROQ RESOLVES (references dereferenced,
// images projected, the appearance fieldset folded into one object) is
// substituted by hand below, exactly as the components always declared it;
// nothing type-checks those against the projection, the same as before.
//
// `_type` is NOT here. The dispatchers own the discriminant: `PageSections`
// switches on the document names, `HomepageCanvas` on the inline names.
//
// The `Subset` assertions at the bottom are the compile-time pin that the
// inline object never carries a field its document lacks: `fields({inline})`
// makes that true by construction today, and a later hand edit to one
// registration breaks the build here rather than in Studio.

type DocKeys = '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev' | 'name'
type AppearanceKeys = 'surface' | 'spacing' | 'sectionBackgroundImage'
type Nullable<T> = {[K in keyof T]?: T[K] | null}

/** The document type minus its document-only keys and the keys GROQ resolves, plus the resolved shapes. */
export type SectionProps<TDoc, K extends keyof TDoc, R> = Nullable<Omit<TDoc, DocKeys | K>> & R

export type BadgeImage = {src?: string | null; alt?: string | null; width?: number | null; height?: number | null}
export type CtaButtonData = {title?: string | null; url?: string | null; variant?: string | null}
export type CaseResultItem = {
  _id?: string
  amount?: string | null
  caseType?: string | null
  caption?: string | null
  year?: number | null
}

export type PracticeAreaNavProps = SectionProps<
  PracticeAreaNav,
  'items' | AppearanceKeys,
  {items?: SiloNavItem[] | null; appearance?: SectionAppearance | null}
>
export type AttorneySectionProps = SectionProps<
  AttorneySection,
  'attorneys' | 'practiceAreaPage' | AppearanceKeys,
  {attorneys?: AttorneyCard[] | null; orderedAttorneyIds?: string[] | null; appearance?: SectionAppearance | null}
>
export type BadgesSectionProps = SectionProps<
  BadgesSection,
  'badges' | 'buttons',
  {badges?: BadgeImage[] | null; buttons?: CtaButtonData[] | null}
>
export type TestimonialsGridProps = SectionProps<
  TestimonialsGrid,
  'testimonials' | AppearanceKeys,
  {testimonials?: TestimonialData[] | null; appearance?: SectionAppearance | null}
>
export type FeaturedTestimonialProps = SectionProps<
  FeaturedTestimonial,
  'testimonial' | AppearanceKeys,
  {testimonial?: TestimonialData | null; appearance?: SectionAppearance | null}
>
export type VideoSectionProps = SectionProps<VideoSection, 'videos', {videos?: VideoItem[] | null}>
// The case-results DOCUMENT is not registered in this release (see the schema
// file), so the inline object is the generated type this one derives from.
export type CaseResultsSectionProps = SectionProps<
  CaseResultsSectionInline,
  'caseResults' | 'ctaButton' | AppearanceKeys,
  {caseResults?: CaseResultItem[] | null; ctaButton?: CtaButtonData | null; appearance?: SectionAppearance | null}
>

// ─── The inline object is a subset of its document ────────────────────────────
type Subset<I, D> = Omit<I, '_type'> extends Omit<D, DocKeys> ? true : never
const _practiceAreaNav: Subset<PracticeAreaNavInline, PracticeAreaNav> = true
const _attorneySection: Subset<AttorneySectionInline, AttorneySection> = true
const _badgesSection: Subset<BadgesSectionInline, BadgesSection> = true
const _testimonialsGrid: Subset<TestimonialsGridInline, TestimonialsGrid> = true
const _featuredTestimonial: Subset<FeaturedTestimonialInline, FeaturedTestimonial> = true
const _videoSection: Subset<VideoSectionInline, VideoSection> = true
void _practiceAreaNav
void _attorneySection
void _badgesSection
void _testimonialsGrid
void _featuredTestimonial
void _videoSection
