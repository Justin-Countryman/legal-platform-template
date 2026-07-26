import type {Metadata} from 'next'

// ─── Per-page robots directives ───────────────────────────────────────────────
// Ruled 2026-07-25 (Justin). Doctrine: `BI-URL-Architecture.md` → Search
// visibility. Two INDEPENDENT operator controls in each page's SEO settings:
//
//   noIndex   — hide this page from search
//   noFollow  — do not follow links on this page
//
// HIDING NO LONGER IMPLIES NOFOLLOW. Every route used to emit
// `{index: false, follow: false}` off `noIndex` alone, so hiding a page also
// stopped crawlers traversing it. A hidden page now follows its links by
// default: `noindex, follow` keeps the page out of the index while letting
// crawlers reach everything it links to, so hiding a thank-you page does not
// strand the pages below it.
//
// `noFollow` defaults to OFF on every page type, with no exceptions, and
// nothing in the platform sets it on. It exists for a client who one day needs
// it. Note the deliberate contrast with the SITE-wide switch
// (`lib/searchVisibility.ts`), which is fail-closed because being wrongly
// listed is the expensive mistake there. Here the safe default is off, so an
// absent field simply means "follow", and no data migration is needed.
//
// Returns an EMPTY object when both are off, so an ordinary page emits no
// `robots` key at all and inherits the root layout's site-wide value — which is
// exactly what it did before this control existed.

export function buildRobotsMeta(
  noIndex?: boolean | null,
  noFollow?: boolean | null,
): Pick<Metadata, 'robots'> | Record<string, never> {
  const hidden = noIndex === true
  const unfollowed = noFollow === true
  if (!hidden && !unfollowed) return {}
  return {robots: {index: !hidden, follow: !unfollowed}}
}
