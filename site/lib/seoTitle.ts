import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {AREA_OF_LAW_PHRASES, phraseForAreaOfLaw} from '@/lib/areaOfLawPhrases'

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
 * TITLE-7. The homepage title when there is no stored cell, built from the
 * firm's practice SCOPE.
 *
 * WHERE SCOPE COMES FROM, established rather than assumed: the firm's
 * **top-level practice area pages** — `practiceArea` documents with no
 * `parentPage`. That is already this codebase's idiom for "area of law": the
 * silo nav's `allTopLevel` mode selects on exactly `!defined(parentPage)`.
 *
 * It is NOT read from Zite's `clientPracticeAreaSelections`, which is where a
 * reader might expect it: those 872 rows carry opaque UUID refs rather than
 * names, and a client site cannot read `CS-FIRM-DATA.json` at all.
 *
 * Two shapes:
 *   one area of law  -> `<stored phrase> - <firm>`
 *   more than one    -> `<firm> - <city> Law Firm`
 *
 * The single-area shape needs a phrase, and a lone area whose name is not one
 * of the fifteen has none — so that case takes the second shape too. Returning
 * `<name> Attorney` for it is the derivation TITLE-4 rejected.
 */
export function homepageTitle(
  areasOfLaw: readonly string[],
  firmName: string | null | undefined,
  primaryCity: string | null | undefined,
): string {
  const firm = (firmName ?? '').trim()
  if (!firm) return ''
  const areas = areasOfLaw.map((a) => (a ?? '').trim()).filter(Boolean)

  if (areas.length === 1) {
    const phrase = phraseForAreaOfLaw(areas[0])
    if (phrase) return `${phrase}${TITLE_SEPARATOR}${firm}`
  }

  const city = (primaryCity ?? '').trim()
  if (!city) return ''
  return `${firm}${TITLE_SEPARATOR}${city} Law Firm`
}

/**
 * TITLE-9. A service area page: the city, then the firm's PRIMARY
 * area-of-law phrase. The homepage formula aimed at one city.
 *
 * **"Primary" is only determinable when the firm has exactly one area of law**,
 * and that is a real limitation rather than a shortcut — see the note in
 * `BI-Content.md` TITLE-9. Nothing in Sanity records which area of law ranks
 * first: `mainNavigation.practiceAreaOrder` is deliberately left for the
 * operator to drag and is empty on a fresh build (its fallback is alphabetical,
 * which would make "Appellate Law" primary for Dudley purely because of the A),
 * and Zite's `areaOfLawRanking` is captured into CS-FIRM-DATA and consumed by
 * nothing.
 *
 * So this returns empty for a multi-area firm and the page falls back to its
 * own name. Guessing would put a confidently wrong phrase on every service area
 * page of every multi-area client.
 */
export function serviceAreaPageName(
  city: string | null | undefined,
  areasOfLaw: readonly string[],
): string {
  const c = (city ?? '').trim()
  if (!c) return ''
  const areas = areasOfLaw.map((a) => (a ?? '').trim()).filter(Boolean)
  if (areas.length !== 1) return ''
  const phrase = phraseForAreaOfLaw(areas[0])
  return phrase ? `${c} ${phrase}` : ''
}

/**
 * A practice area page AT AREA-OF-LAW LEVEL uses the stored phrase directly.
 *
 * HOW THE CODE TELLS THE TWO APART: a `practiceArea` with no `parentPage` is at
 * area-of-law level; one beneath an area of law has a parent. Site-Build sets
 * `parentPage` from the slug — a nested slug like `family-law/divorce` gets
 * one, a single-segment `family-law` does not — and the same `!defined(parentPage)`
 * test already drives the silo nav. Dudley's real data splits 14 top-level to
 * 28 beneath, so it is populated rather than theoretical.
 *
 * BOTH conditions are required: no parent AND a title that is one of the
 * fifteen. The title check alone would catch a page named `Tax Law` sitting
 * BENEATH `Business Law`; the parent check alone would hand a phrase to
 * Dudley's `Appellate Law`, which has none.
 *
 * **Pages beneath an area of law get nothing from here, deliberately.** Ruled
 * 2026-07-26: there is no derived formula and no stored list for the 195, so
 * they fall back to their page name and the operator corrects individual pages
 * in Sanity after checking the live site.
 */
export function areaOfLawPageName(
  title: string | null | undefined,
  hasParentPage: boolean,
): string {
  if (hasParentPage) return ''
  return phraseForAreaOfLaw(title)
}

/**
 * TITLE-8. Split a geo hub's title into its city and its area of law.
 *
 * A geo hub is titled `{city} {practice}` — `Woodbury Personal Injury` — because
 * that is the one hub shape (ruled 2026-07-26; `BI-URL-Architecture.md`). The
 * title is the only place either value exists: `geoPracticeArea` has no city
 * field and no reference to the practice area it targets.
 *
 * THE RULE: strip the longest of the fifteen canonical AREA-OF-LAW NAMES that
 * the title ends with, on a word boundary, case-insensitively. What is left is
 * the city. Both halves must be non-empty or the split fails.
 *
 * It is a lookup against a stored list, not a heuristic — which is what makes it
 * defensible. `phraseForAreaOfLaw`'s keys are the fifteen, so the same table
 * that supplies the phrase decides where the title divides. No two of the
 * fifteen are suffixes of one another today (checked), so a match is
 * unambiguous; longest-first is used anyway so a future sixteenth area cannot
 * introduce ambiguity silently.
 *
 * WHAT IT WILL GET WRONG, stated rather than discovered:
 *
 *   1. **A practice outside the fifteen.** `Woodbury Appellate Law` does not
 *      match, so the page falls back to its plain page name. This is the COMMON
 *      case, not the edge: seven of Dudley's fourteen top-level practice areas
 *      are not among the fifteen.
 *   2. **Practice-first titles.** `Personal Injury Woodbury` does not match.
 *   3. **No city at all.** `Personal Injury` matches the whole title, leaving no
 *      city — guarded, falls back.
 *   4. **A city whose name ends with an area name.** `New Business Law` would
 *      split to city `New`, area `Business Law`. Contrived for US city names,
 *      but it is a real property of suffix matching and the rule cannot tell.
 *
 * Every failure lands on the same safe outcome — the page name — so a wrong
 * split never ships a wrong city; it ships a plainer title.
 */
export function splitGeoHubTitle(
  hubTitle: string | null | undefined,
): {city: string; areaOfLaw: string} {
  const title = (hubTitle ?? '').trim()
  if (!title) return {city: '', areaOfLaw: ''}

  const candidates = Object.keys(AREA_OF_LAW_PHRASES)
    .slice()
    .sort((a, b) => b.length - a.length)

  for (const area of candidates) {
    const lower = title.toLowerCase()
    const suffix = area.toLowerCase()
    if (!lower.endsWith(suffix)) continue
    const cut = title.length - area.length
    // Word boundary: the character before the match must be whitespace, or
    // `Woodbury Personal Injury` would also match a title like `XPersonal
    // Injury`.
    if (cut === 0 || !/\s/.test(title[cut - 1])) continue
    const city = title.slice(0, cut).trim()
    if (!city) continue
    return {city, areaOfLaw: title.slice(cut).trim()}
  }
  return {city: '', areaOfLaw: ''}
}

/**
 * TITLE-8, hub: the city, then the practice's stored phrase.
 * `Woodbury Personal Injury` -> `Woodbury Personal Injury Lawyer`
 */
export function geoHubPageName(hubTitle: string | null | undefined): string {
  const {city, areaOfLaw} = splitGeoHubTitle(hubTitle)
  if (!city) return ''
  const phrase = phraseForAreaOfLaw(areaOfLaw)
  return phrase ? `${city} ${phrase}` : ''
}

/**
 * TITLE-8, spoke: the city from its HUB, then the spoke's own page name.
 * `Woodbury Personal Injury` + `Car Accidents` -> `Woodbury Car Accidents`
 *
 * The spoke's own name is used verbatim, with no phrase lookup — TITLE-5 was
 * retired, so a practice beneath an area of law has no stored phrase and no
 * derived one. The spoke reaches its hub through `parentPage`.
 */
export function geoSpokePageName(
  hubTitle: string | null | undefined,
  spokeTitle: string | null | undefined,
): string {
  const {city} = splitGeoHubTitle(hubTitle)
  const spoke = (spokeTitle ?? '').trim()
  if (!city || !spoke) return ''
  return `${city} ${spoke}`
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
