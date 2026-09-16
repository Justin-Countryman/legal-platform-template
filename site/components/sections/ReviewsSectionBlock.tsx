import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {SectionShell, type SectionAppearance} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
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

// ─── The frame (Phase 13) ─────────────────────────────────────────────────────
// All three shapes were transparent, so `pattern` is the default: the band paints
// no background of its own, which is today's rendering exactly. A code default,
// never an `initialValue`, because the composer folds a seed into every band it
// writes (item 308, [R-450]).

/** The appearance this section will actually render with, for the seam walk. */
export function resolveAppearance(data: ReviewsSectionBlockData): SectionAppearance {
  return {...data.appearance, surface: data.appearance?.surface ?? 'pattern'}
}

/** A reviews band IS its embed. */
export function isEmpty(data: ReviewsSectionBlockData): boolean {
  return !data.reviewsEmbed
}

export function ReviewsSectionBlock({
  data,
  napTokens,
  seam = NO_SEAM,
}: {
  data: ReviewsSectionBlockData
  napTokens?: NapTokens | null
  seam?: SeamProps
}) {
  // Narrowed locally as well as guarded by `isEmpty`, which the seam walk calls
  // but TypeScript cannot see through.
  const embed = data.reviewsEmbed
  if (!embed) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const description = resolveTokenString(data.description, napTokens)
  const buttons = toCtaItems(data.buttons)
    .slice(0, 2)
    .map((item) => ({...item, label: resolveTokenString(item.label, napTokens)}))

  const body =
    data.layout === 'split' ? (
      <>
        <div className="md:col-span-5">
          {heading && (
            <SectionHeader tagline={tagline} heading={heading} description={description} alignment="left" className="mb-6" />
          )}
          {buttons.length > 0 && <ButtonGroup items={buttons} />}
        </div>
        <div className="md:col-span-7">
          <HtmlEmbed html={embed} aria-label={heading || 'Reviews'} />
        </div>
      </>
    ) : buttons.length > 0 ? (
      <>
        {heading && (
          <SectionHeader tagline={tagline} heading={heading} description={description} className="mx-auto mb-6 max-w-2xl" />
        )}
        <ButtonGroup items={buttons} align="center" className="mb-12" />
        <HtmlEmbed html={embed} />
      </>
    ) : (
      <>
        {heading && (
          <SectionHeader tagline={tagline} heading={heading} description={description} className="mx-auto mb-12 max-w-2xl" />
        )}
        <HtmlEmbed html={embed} />
      </>
    )

  return (
    <SectionShell
      appearance={resolveAppearance(data)}
      innerClassName={data.layout === 'split' ? 'grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-16' : undefined}
      seamTop={seam.seamTop}
      previousGround={seam.previousGround}
      previousEdge={seam.previousEdge}
    >
      {body}
    </SectionShell>
  )
}
