import Link from 'next/link'
import {TertiaryArrow} from '@/components/ui/TertiaryArrow'
import {type CaseResultItem} from '@/components/sections/sectionProps'

// ─── One case result, as a card ───────────────────────────────────────────────
//
// The card the Featured Case Results section and the Case Results page both draw
// (monorepo backlog 454, WS-CASE-RESULTS-DESIGN-2026-10-13.md §11). The Result is
// the loudest line, then the case type and year, then the summary. A result with a
// page of its own is a whole-card link to that page and to nothing else; one
// without is a card that links nowhere ("cards and only cards with no links to a
// page or have the option to have that card linked to a page", Justin 2026-10-14).
//
// The static card's markup is the section's own from before this file existed, so
// every page that drew one draws it unchanged. The linked card wears the same
// chrome and adds the lift and the focus ring a whole-card link takes (`CardLink`'s
// treatment, on this card's own surface).
//
// Either way the card is a light surface wherever it sits: an operator can set the
// band dark or image, and without the light context the card's text inherited the
// dark band's (measured 1.06:1, Phase 14).
//
// No disclaimer here: the list a card sits in draws it, once, beside the results.

const CARD = 'rounded-ui bg-muted p-6 shadow-card-rest md:p-8'
const LINKED = [
  'group block h-full',
  'transition-[translate,box-shadow] duration-ui-slow ease-smooth',
  'hover:shadow-card-hover hover:card-lift',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
].join(' ')

export function CaseResultCard({
  result,
  level = 'h3',
  className,
}: {
  result: CaseResultItem
  /** h3 under a section's h2; h2 on the Case Results page, under its H1. */
  level?: 'h2' | 'h3'
  /** The grid's class for this item. */
  className?: string
}) {
  const Heading = level
  const body = (
    <>
      {result.amount ? (
        <Heading className="font-heading text-2xl font-bold text-foreground md:text-3xl">{result.amount}</Heading>
      ) : null}
      {result.caseType || result.year ? (
        <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">
          {[result.caseType, result.year].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      {result.caption ? <p className="mt-3 text-foreground-muted">{result.caption}</p> : null}
    </>
  )

  if (!result.href) {
    return (
      <li data-card="" data-ring-context="light" className={`${CARD} ${className ?? ''}`}>
        {body}
      </li>
    )
  }
  return (
    <li className={className}>
      <Link href={result.href} data-card="" data-ring-context="light" className={`${CARD} ${LINKED}`}>
        {body}
        <p className="mt-4 text-sm font-semibold text-foreground">
          Read the case <TertiaryArrow />
        </p>
      </Link>
    </li>
  )
}
