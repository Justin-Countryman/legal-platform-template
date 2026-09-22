import {Button} from '@/components/ui/Button'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {SectionShell} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import {type CaseResultsSectionProps} from './sectionProps'

// ─── Case Results section ─────────────────────────────────────────────────────
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

/** The results this section draws: a result with no amount and no caption has
 *  nothing to show, and a dangling reference projects as null. The render, `isEmpty`
 *  and the grey box all read this one filter (Phase 17A), so the walk never counts a
 *  band the page does not draw. */
export function visibleResults(data: CaseResultsSectionData) {
  return (data.caseResults ?? []).filter(
    (r): r is NonNullable<typeof r> => r != null && Boolean(r.amount || r.caption),
  )
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
}: {
  data: CaseResultsSectionData
  /** Resolved by the dispatcher via resolveResultsDisclaimer(); never empty. Required. */
  disclaimer: string
  napTokens?: NapTokens | null
  seam?: SeamProps
}) {
  const results = visibleResults(data)

  // No results means no results are being published, so there is nothing to
  // disclaim and the section renders nothing at all. This is the ONLY branch in
  // which the disclaimer does not render, and it is the branch in which no case
  // result renders either.
  if (results.length === 0) return null

  const heading = resolveTokenString(data.heading, napTokens)
  const intro = resolveTokenString(data.intro, napTokens)
  const cta = data.ctaButton?.title && data.ctaButton?.url ? data.ctaButton : null

  return (
    <SectionShell
      appearance={resolveAppearance(data)}
      seam={seam}
    >
      {heading && (
        <SectionHeader heading={heading} description={intro} className="mx-auto mb-12 max-w-2xl" />
      )}

      <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Case results">
        {results.map((r, i) => (
          // A light card keeps light-surface text wherever the band is: an operator
          // can set this section dark or image, and without the light context the
          // card's text inherited the dark band's (measured 1.06:1, Phase 14).
          <li key={r._id ?? i} data-card="" data-ring-context="light" className="rounded-ui bg-muted p-6 shadow-card-rest md:p-8">
            {r.amount ? (
              // The result itself is the loudest thing in the card. h3, so it
              // sits under the section's single h2.
              <h3 className="font-heading text-2xl font-bold text-foreground md:text-3xl">{r.amount}</h3>
            ) : null}
            {r.caseType || r.year ? (
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">
                {[r.caseType, r.year].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            {r.caption ? <p className="mt-3 text-foreground-muted">{r.caption}</p> : null}
          </li>
        ))}
      </ul>

      {/* REQUIRED. See the header. This renders whenever a case result does. */}
      <p
        data-testid="results-disclaimer"
        className="mx-auto mt-8 max-w-3xl text-center text-sm text-foreground-subtle"
      >
        {disclaimer}
      </p>

      {cta ? (
        <div className="mt-8 flex justify-center">
          <Button href={cta.url as string} variant={cta.variant === 'secondary' ? 'secondary' : 'primary'}>
            {resolveTokenString(cta.title, napTokens)}
          </Button>
        </div>
      ) : null}
    </SectionShell>
  )
}
