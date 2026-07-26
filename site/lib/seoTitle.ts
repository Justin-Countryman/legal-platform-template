import {resolveTokenString, type NapTokens} from '@/lib/tokens'

// Title tags for the site package. Doctrine: `BI-Content.md` § Title tags,
// rules TITLE-1 (a title is complete as authored; nothing is ever appended),
// TITLE-2 (every formula ends with the firm name) and TITLE-3 (length).
//
// THREE COPIES OF THE SEPARATOR EXIST, DELIBERATELY, AND THIS IS ONE OF THEM.
// The other two are `studio/schemas/seoTitle.ts` and `BE/_shared/seo_title.py`.
// They cannot be collapsed:
//   - studio cannot import from site. That cross-package import is the exact
//     mechanism behind OUTSTANDING item 22 failure 1 — Node resolves from the
//     importing file, so `site/lib/*` resolves against `site/node_modules`,
//     which CI never installs for studio. One such import already blocks
//     typegen; adding another would widen a known break.
//   - the tools are Python and live in a different repository.
// So the cost is three literals instead of one. It is written down in all
// three places rather than discovered later as drift, because drift here is
// silent: a mismatched separator still renders a plausible title. The last
// time it drifted, `_SEO_TITLE_TEMPLATE_JOIN` said `" | "` for three days
// after the layout moved to `" - "`, and nothing caught it.

/** The root layout's title template separator. `<fragment>` + this + firm name. */
export const TITLE_SEPARATOR = ' - '

/**
 * The rendered-title length ceiling. WARNS, NEVER BLOCKS (operator ruling,
 * 2026-07-26). It measures the RENDERED title — the fragment plus the
 * separator plus the firm name — not the stored field, because the field is
 * not what search results truncate.
 */
export const RENDERED_TITLE_MAX = 60

/** The root layout's title template. Its ONLY consumer is the 404 — see the
 * note in app/layout.tsx. */
export function titleTemplate(firmName: string): string {
  return `%s${TITLE_SEPARATOR}${firmName}`
}

/**
 * A formula's output: the page's own name, then the firm name (TITLE-2).
 *
 * Called only when there is NO stored cell. An empty firm name yields the page
 * name alone rather than a string ending in a dangling separator.
 */
export function composeTitle(pageName: string | null | undefined, firmName: string | null | undefined): string {
  const name = (pageName ?? '').trim()
  const firm = (firmName ?? '').trim()
  if (!name) return firm
  if (!firm) return name
  return `${name}${TITLE_SEPARATOR}${firm}`
}

/**
 * THE ONE PLACE A PAGE TITLE IS DECIDED. Every route uses this.
 *
 * TITLE-1: a stored CS-SITEMAP cell is the complete, finished title and is used
 * EXACTLY as written. A formula runs only when there is no cell, and produces a
 * complete title of its own. Either way **nothing is appended afterwards** —
 * which is why this always returns `absolute`, bypassing the root layout's
 * template. That template still exists, but for one consumer only: the 404,
 * which cannot compute its own title. See app/layout.tsx.
 *
 * Returns TWO values, and the second is not an afterthought:
 *
 *   `title` — the complete document title, for `<title>`.
 *   `label` — the page-specific part, for the OG card and `openGraph.title`.
 *
 * They diverge for a page with a cell, and keeping them separate is what stops
 * the social card reading "Dudley & Smith" above "Appeals | Dudley & Smith".
 * Before TITLE-1 there was only one value because the title WAS the label; now
 * the caller needs both. Passing `title` to `buildSocialMeta` would change every
 * card on the site, which is not what this ruling asked for.
 *
 * Both are `undefined` when there is nothing to say, never `''`, so Next falls
 * to the root `title.default` (the bare firm name) rather than rendering an
 * empty or separator-led title.
 */
export function resolveTitle(
  seoTitle: string | null | undefined,
  pageName: string | null | undefined,
  tokens: NapTokens | null | undefined,
  firmName: string | null | undefined,
  completeTitle?: string | null,
): {title: {absolute: string} | undefined; label: string | undefined} {
  const cell = resolveTokenString(seoTitle, tokens).trim()
  if (cell) {
    // The cell is the whole title. Verbatim, including any firm name it
    // already carries — that is no longer a defect to guard against.
    return {title: {absolute: cell}, label: cell}
  }
  const name = resolveTokenString(pageName, tokens).trim()
  const complete = (completeTitle ?? '').trim()
  if (complete) {
    // A formula whose shape is not `<page name> - <firm name>`. Today only the
    // about page: `About <firm> - <city> Law Firm` puts the firm in the middle
    // and closes on "Law Firm", so it cannot be composed and is supplied whole.
    // The label stays the page's own name so the social card is unaffected.
    return {title: {absolute: complete}, label: name || complete}
  }
  if (!name) return {title: undefined, label: undefined}
  return {title: {absolute: composeTitle(name, firmName)}, label: name}
}

// ─── Per-page-type formulas ───────────────────────────────────────────────────
// Each produces the title used when a page has NO stored cell. They live here
// rather than in the routes so the shapes are readable side by side and cannot
// drift from `composeTitle`.

/** TITLE-10. Fixed; no per-client variation. */
export const SERVICE_AREA_INDEX_PAGE_NAME = 'Areas We Serve'

/**
 * TITLE-11. `Woodbury, MN Law Office`, composed with the firm name by the
 * caller. City and state come from the location the page is FOR, not from the
 * firm's primary office — a location page for Woodbury must not be titled with
 * the head office's city.
 *
 * Degrades rather than emitting punctuation with nothing around it: no city
 * yields an empty string, and the route then falls back to the page's own name.
 */
export function locationPageName(
  city: string | null | undefined,
  state: string | null | undefined,
): string {
  const c = (city ?? '').trim()
  const s = (state ?? '').trim()
  if (!c) return ''
  return s ? `${c}, ${s} Law Office` : `${c} Law Office`
}

/**
 * The about page's formula: `About <firm> - <primary geo> Law Firm`.
 *
 * A COMPLETE title, not a page name — it puts the firm name in the middle and
 * closes on "Law Firm", so it is a named exception to TITLE-2 rather than
 * something `composeTitle` can build. TITLE-7's second shape is the other one.
 *
 * Primary geo is the firm's PRIMARY location's city, which reaches the route as
 * the `office.city` NAP token (`expandNapTokens` resolves `office.*` to
 * `siteSettings.primaryLocation` when no location id is passed). With no city,
 * this returns empty and the caller falls back to the page name — `About` — so
 * a firm with no location data still gets a sensible title.
 */
export function aboutPageTitle(
  firmName: string | null | undefined,
  primaryCity: string | null | undefined,
): string {
  const firm = (firmName ?? '').trim()
  const city = (primaryCity ?? '').trim()
  if (!firm || !city) return ''
  return `About ${firm}${TITLE_SEPARATOR}${city} Law Firm`
}

/**
 * The title every route that is about to call `notFound()` reports, so the
 * 404 page carries a real title instead of inheriting `title.default` (the
 * bare firm name).
 *
 * This is a ROUTE-level fragment, not a document. `not-found.tsx` is a UI
 * boundary with no metadata of its own, and the `404page` CS-SITEMAP type
 * deliberately creates no Sanity document in either tool, so there is nothing
 * to read a title off. The metadata for a 404 therefore has to come from the
 * route that decided to 404 — which is every route below, and the catch-all
 * for any URL that matches no route at all.
 */
export const NOT_FOUND_TITLE = 'Page Not Found'
