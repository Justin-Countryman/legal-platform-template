import type {Metadata} from 'next'
import {client} from '@/lib/sanity/client'
import {SITE_HIDDEN_QUERY, resolveHidden} from '@/lib/searchVisibility'

// ─── Per-page robots directives ───────────────────────────────────────────────
// Doctrine: `BI-URL-Architecture.md` → Search visibility, rules SEARCH-1
// (the site-wide setting wins over any page setting) and SEARCH-8 (hidden and
// nofollow are independent per-page controls).
//
// Two INDEPENDENT operator controls in each page's SEO settings:
//
//   noIndex   — hide this page from search
//   noFollow  — do not follow links on this page
//
// HIDING NO LONGER IMPLIES NOFOLLOW. A hidden page follows its links by
// default: `noindex, follow` keeps the page out of the index while letting
// crawlers reach everything it links to, so hiding a thank-you page does not
// strand the pages below it.
//
// `noFollow` defaults to OFF on every page type, with no exceptions, and
// nothing in the platform sets it on. Note the deliberate contrast with the
// SITE-wide switch (`lib/searchVisibility.ts`), which is fail-closed because
// being wrongly listed is the expensive mistake there.
//
// ─── WHY THIS IS ASYNC, AND WHY IT READS THE SITE-WIDE SWITCH ─────────────────
//
// SEARCH-1 says the site-wide setting wins over any page setting, with NO
// exception. Until 2026-07-26 it did not, and the hole was real rather than
// theoretical: a page with `noFollow` on and `noIndex` off returned
// `{index: true, follow: false}`, and **a route's metadata REPLACES the root
// layout's** — so that one page rendered `index, nofollow` while the whole site
// was hidden. Reproduced on a real render before this was written.
//
// The obvious cheaper fix does not work, and was tried and measured: omitting
// the `index` key when the page is not hidden, in the hope that the layout's
// `index: false` would survive. **Next does not merge the `robots` object
// across segments; it replaces it.** The probe rendered `nofollow` alone, with
// the site-wide `noindex` gone — strictly worse than the leak it was meant to
// close.
//
// So the decision has to be made where both inputs are in scope, which means
// this helper reads the site-wide switch itself. It is deliberately NOT left to
// each route to remember: 15 call sites each having to fetch and apply the same
// value is exactly the "decided in three places at once" shape that
// `BE/_shared/search_visibility.py` exists to prevent on the tool side. The
// query is a single field and Next dedupes it across a render pass.

/**
 * Robots metadata for one page.
 *
 * When the site is hidden, this returns the site-wide answer and the page's own
 * settings are ignored — that IS the rule, not a limitation. The value returned
 * in that case is byte-identical to what the root layout emits, so an ordinary
 * page on a hidden site renders exactly what it rendered before.
 *
 * Returns an EMPTY object when the site is visible and the page sets neither
 * control, so an ordinary page emits no `robots` key at all and inherits the
 * root layout's value — which is what it did before this control existed.
 */
export async function buildRobotsMeta(
  noIndex?: boolean | null,
  noFollow?: boolean | null,
): Promise<Pick<Metadata, 'robots'> | Record<string, never>> {
  const siteHidden = resolveHidden(await client.fetch<unknown>(SITE_HIDDEN_QUERY))
  if (siteHidden) {
    // SEARCH-1: the site-wide setting wins over any page setting. Matches the
    // root layout's hidden value exactly, so nothing about an ordinary page on
    // a hidden site changes.
    return {robots: {index: false, follow: false}}
  }

  const hidden = noIndex === true
  const unfollowed = noFollow === true
  if (!hidden && !unfollowed) return {}
  return {robots: {index: !hidden, follow: !unfollowed}}
}
