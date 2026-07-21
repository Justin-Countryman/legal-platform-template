import {Button} from '@/components/ui/Button'

// ─── Case Results block ───────────────────────────────────────────────────────
//
// CLIENT-OWNED. `components/homepage/` holds block components only; the
// dispatcher is platform-owned at `components/layout/HomepageCanvas.tsx`. Keep
// the path and export name; the markup is yours to replace.
//
// TOKENS ONLY. No ScrollReveal here: motion belongs to the canvas.
// Heading is `marketing-h2` written directly, never <SectionHeader>, per
// BI-Library Layer 3 rule 2.
//
// ─── THE DISCLAIMER IS NOT OPTIONAL, AND NOT YOURS TO REMOVE ──────────────────
//
// `disclaimer` is a REQUIRED prop, deliberately. Bar advertising rules require
// past results to be paired with a disclaimer, always, and "always" has to
// survive every reachable state of the data and every rewrite of this file.
//
// Three things hold it up, and you are looking at only one of them:
//   1. The VALUE cannot be empty. It resolves from a code constant in
//      site/lib/legal.ts; `siteSettings.resultsDisclaimer` overrides the wording
//      and nothing switches it off. Undefined, null, empty and whitespace all
//      fall through to the constant.
//   2. The PROP is required and resolved by the platform-owned canvas, not
//      here, so this component cannot substitute a different source.
//   3. The RENDER is pinned by a platform-owned test in
//      components/layout/__tests__/, which a client rewriting this file cannot
//      delete without the drift pass reporting it.
//
// If you rewrite this block's markup for a client, the disclaimer element goes
// with it. Removing it is a bar-compliance defect, not a design choice.

export type CaseResultItem = {
  _id?: string
  amount?: string | null
  caseType?: string | null
  caption?: string | null
  year?: number | null
}

export type CaseResultsBlockData = {
  _type: 'caseResultsBlock'
  _key: string
  heading?: string | null
  intro?: string | null
  caseResults?: CaseResultItem[] | null
  ctaButton?: {title?: string | null; url?: string | null; variant?: string | null} | null
}

export function CaseResultsBlock({
  data,
  disclaimer,
}: {
  data: CaseResultsBlockData
  /** Resolved by the canvas via resolveResultsDisclaimer(); never empty. Required. */
  disclaimer: string
}) {
  // A result with no amount and no caption has nothing to show.
  const results = (data.caseResults ?? []).filter((r) => r.amount || r.caption)

  // No results means no results are being published, so there is nothing to
  // disclaim and the block renders nothing at all. This is the ONLY branch in
  // which the disclaimer does not render, and it is the branch in which no case
  // result renders either.
  if (results.length === 0) return null

  const cta = data.ctaButton?.title && data.ctaButton?.url ? data.ctaButton : null

  return (
    <section className="px-[5%] py-16 md:py-24">
      {data.heading || data.intro ? (
        <div className="container mx-auto max-w-3xl text-center">
          {data.heading ? (
            <h2 className="marketing-h2 font-heading font-bold text-foreground">{data.heading}</h2>
          ) : null}
          {data.intro ? <p className="mt-4 text-foreground-muted">{data.intro}</p> : null}
        </div>
      ) : null}

      <div className="container mx-auto mt-12 max-w-6xl">
        <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r, i) => (
            <li key={r._id ?? i} className="rounded-ui bg-muted p-6 shadow-card-rest md:p-8">
              {r.amount ? (
                // The result itself is the loudest thing in the card. h3, so it
                // sits under the block's single h2.
                <h3 className="marketing-h4 font-heading font-bold text-foreground">{r.amount}</h3>
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
              {cta.title}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
