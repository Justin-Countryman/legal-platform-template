import {SectionHeader} from '@/components/ui/SectionHeader'
import {CaseResultCard} from '@/components/ui/CaseResultCard'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {SectionShell} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import {type CaseResultItem, type CaseResultsSectionProps} from './sectionProps'
import {headingFit} from '@/lib/headingFit'
import {CASE_RESULT_TIERS, CASE_RESULT_TIERS_FOUR, NARROW_FEW, countGridClasses} from './countGrid'

// ─── Featured Case Results section ────────────────────────────────────────────
//
// WHAT IT SHOWS (monorepo backlog 454, WS-CASE-RESULTS-DESIGN-2026-10-13.md §11,
// ruled by Justin 2026-10-14): the results marked Featured, not a list picked
// here. On the homepage, any area of law; on a practice page, that page's area of
// law only ("only displaying the correct case results in the practice area
// silo"); a section naming an area of law, that area anywhere. Up to six, eight
// at four across, newest first. It links to nothing but each card's own page:
// "the section doesn't link to the case results page that has the cards", so the
// header link and the button it once carried are gone.
//
// Promoted from `components/homepage/CaseResultsBlock.tsx` (Phase 10,
// 2026-09-14): the shared section the homepage list renders for
// `caseResultsSectionInline`, and the one an interior page's `sections` list
// renders for the `caseResultsSection` document (Phase 11). Like every shared section it renders
// through `SectionShell`, so the Appearance fieldset its schema declares does
// something; the old block keeps its own markup for one pin and is deleted in
// Phase 15.
//
// ─── THE DISCLAIMER IS NOT OPTIONAL ───────────────────────────────────────────
//
// `disclaimer` is a REQUIRED prop, deliberately. Bar advertising rules require
// past results to be paired with a disclaimer, always, and "always" has to
// survive every reachable state of the data and every rewrite of this file.
//
//   1. The VALUE cannot be empty. It resolves from a code constant in
//      site/lib/legal.ts; `siteSettings.resultsDisclaimer` overrides the wording
//      and nothing switches it off. Undefined, null, empty and whitespace all
//      fall through to the constant.
//   2. The PROP is required and resolved by the platform-owned dispatcher, not
//      here, so this component cannot substitute a different source.
//   3. The RENDER is pinned by a platform-owned test in
//      components/layout/__tests__/.
//
// The disclaimer element is bar compliance, not a design choice.

export type CaseResultsSectionData = CaseResultsSectionProps

// ─── The frame (Phase 13) ───────────────────────────────────────────────────
// Exported for the seam walk in `sectionFrame.ts`: the dispatchers need to
// know, before rendering anything, what ground this band will sit on and
// whether it will render at all.

/** The appearance this section will actually render with. */
export function resolveAppearance(data: CaseResultsSectionData) {
  return data.appearance
}

/** A result with something to show: a Result or a Summary holding a word. The same
 *  test as `CASE_RESULT_SHOWN` in queries.ts, which the index's 404 and `sitemap.xml`
 *  read; caseResults.test.ts holds the two equal. */
export function isShownResult(r: {amount?: string | null; caption?: string | null}): boolean {
  const hasWord = (v?: string | null) => (v ?? '').split(' ').some((w) => w !== '')
  return hasWord(r.amount) || hasWord(r.caption)
}

/** The most a section shows: six, eight at four across (two rows of four). */
export function resultsCap(data: Pick<CaseResultsSectionData, 'across'>): number {
  return data.across === 'four' ? 8 : 6
}

/** The results this section draws: shown, and no more than the cap. A practice page
 *  narrows the list to its silo first (`scopeCaseResults`), so the cap counts that
 *  silo's results. The render, `isEmpty` and the grey box all read this one filter
 *  (Phase 17A), so the walk never counts a band the page does not draw. */
export function visibleResults(data: CaseResultsSectionData): CaseResultItem[] {
  return (data.caseResults ?? [])
    .filter((r): r is NonNullable<typeof r> => r != null && isShownResult(r))
    .slice(0, resultsCap(data))
}

/** The silo a page shows: an area of law's id, or null for a page that belongs to
 *  one it cannot name (a geo practice page). Null or undefined scope: not a practice
 *  page, every area. Projected by the page query (`caseResultsScope`). */
export type CaseResultsScope = {areaOfLaw: string | null} | null

/** Narrow every Featured Case Results section on a page to the page's silo, before
 *  anything walks or draws the list. A section that names its own area of law was
 *  narrowed by its query and is left alone. A preview's draft id names the
 *  published area. */
export function scopeCaseResults<T extends {_type?: string | null}>(sections: T[], scope: CaseResultsScope | undefined): T[] {
  if (!scope) return sections
  const area = scope.areaOfLaw ? scope.areaOfLaw.replace(/^drafts\./, '') : null
  return sections.map((section) => {
    const s = section as T & {caseResults?: CaseResultItem[] | null; areaOfLaw?: string | null}
    if (s._type !== 'caseResultsSection' && s._type !== 'caseResultsSectionInline') return section
    if (s.areaOfLaw) return section
    return {...s, caseResults: area ? (s.caseResults ?? []).filter((r) => r?.areaOfLaw === area) : []}
  })
}

/** True when this section renders nothing, so the walk skips it and it never
 *  becomes the "previous band" for the one after it (item 312). */
export function isEmpty(data: CaseResultsSectionData): boolean {
  return visibleResults(data).length === 0
}

export function CaseResultsSection({
  data,
  disclaimer,
  napTokens,
  seam = NO_SEAM,
  scale,
}: {
  data: CaseResultsSectionData
  /** Resolved by the dispatcher via resolveResultsDisclaimer(); never empty. Required. */
  disclaimer: string
  napTokens?: NapTokens | null
  seam?: SeamProps
  /** The homepage passes `marketing`: the heading takes the marketing scale, as the content section's does, so every
   *  section on one page draws one heading size (monorepo `[R-641]`). Absent: the interior tier. */
  scale?: 'marketing'
}) {
  const results = visibleResults(data)
  const grid = countGridClasses(results.length, data.across === 'four' ? CASE_RESULT_TIERS_FOUR : CASE_RESULT_TIERS, NARROW_FEW)

  // No results means no results are being published, so there is nothing to
  // disclaim and the section renders nothing at all. This is the ONLY branch in
  // which the disclaimer does not render, and it is the branch in which no case
  // result renders either.
  if (results.length === 0) return null

  const heading = resolveTokenString(data.heading, napTokens)
  const emphasis = resolveTokenString(data.headingEmphasis, napTokens)
  const intro = resolveTokenString(data.intro, napTokens)

  return (
    <SectionShell
      appearance={resolveAppearance(data)}
      seam={seam}
    >
      {/* No header link: the section links to nothing but each card's own page (backlog 454). */}
      {heading && (
        <SectionHeader emphasis={emphasis} scale={scale} heading={heading} fit={headingFit(heading, seam.site?.headingFace)} description={intro} className="mx-auto mb-12 max-w-2xl" />
      )}

      {/* Phase 18 session D: the columns follow the count (`countGrid.ts`; a result card lies sideways, so three across
          and two by two at four, as session B's sideways cards). They were three across whatever the count. */}
      <ul role="list" className={`${grid.list} gap-6`} aria-label="Case results">
        {results.map((r, i) => (
          <CaseResultCard key={r._id ?? i} result={r} level="h3" className={grid.items[i]} />
        ))}
      </ul>

      {/* REQUIRED. See the header. This renders whenever a case result does. */}
      <p
        data-testid="results-disclaimer"
        className="mx-auto mt-8 max-w-3xl text-center text-sm text-foreground-subtle"
      >
        {disclaimer}
      </p>
    </SectionShell>
  )
}
