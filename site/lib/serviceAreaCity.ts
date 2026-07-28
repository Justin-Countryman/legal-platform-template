/**
 * The city a service area page is FOR, for the `/service-area/` index card.
 *
 * Doctrine: `BI/BI-Workflow.md` → "SERVICE AREA PAGES: the four surfaces",
 * ruled by Justin 2026-07-28.
 *
 * THE CARD SHOWS THE CITY ALONE. Not "Law Firm", not "Law Office" — and the
 * second exclusion is a ruling rather than a preference. `Law Office` is
 * TITLE-11's word for a `locationPage`, which has a street address. A service
 * area page has none: it is a city the firm serves, not a place it sits. Nine
 * cards reading "Law Office" would claim nine offices the firm does not have.
 *
 * WHY THIS IS DERIVED RATHER THAN READ OFF A FIELD. Under the ruling both
 * stored strings are `{city} Law Firm` — the page name and the H1 are the same
 * value — so neither carries the bare city. Deriving it from the slug uses the
 * ruled URL shape `/service-area/{city}-law-firm/` and keeps the card agreeing
 * with the H1 by construction: one city, two renderings of it.
 *
 * WHAT THIS FIXED, so a future reader does not "simplify" it back. The card
 * used to render `coalesce(hero.heading, title)`, and `hero.heading` carried
 * the FIRM'S primary office city — nine live Dudley cards read
 * "Mendota Heights Blaine Law Firm", "Mendota Heights Woodbury Law Firm" and so
 * on. The index also buckets its A-Z filter and runs its search on this label,
 * so every city sat under M and filtering by B returned nothing.
 *
 * THIS IS A MIRROR of `BE/_shared/service_area.py::city_from_slug`. Python in
 * another repository, which a client site cannot import — the same cost
 * `seoTitle.ts` and `areaOfLawPhrases.ts` already carry, written down for the
 * same reason. **Change both together.**
 */

/** The ruled URL shape's suffix. Mirrors `SLUG_SUFFIX` in the Python. */
export const SERVICE_AREA_SLUG_SUFFIX = '-law-firm'

const MINOR_WORDS = new Set([
  'and', 'or', 'of', 'the', 'in', 'for', 'to', 'a', 'an', 'with', 'on', 'at',
])

/**
 * Title-case a kebab slug, minor words lowercased except the first.
 * Mirrors `titlecase_slug` in `BE/_shared/page_name.py`, which is what produced
 * the stored page name — so the card and the page name spell a two-word city
 * the same way.
 */
function titlecaseSlug(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((w, i) =>
      i === 0 || !MINOR_WORDS.has(w.toLowerCase())
        ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        : w.toLowerCase(),
    )
    .join(' ')
}

/**
 * `service-area/white-bear-lake-law-firm` -> `White Bear Lake`.
 *
 * Returns '' when the leaf does not carry the ruled suffix. Empty, never a
 * guess: the caller falls back to the stored page name, and a wrong place name
 * on a live card is worse than a plain one.
 */
export function cityFromServiceAreaSlug(slug: string | null | undefined): string {
  const leaf = (slug ?? '').trim().replace(/\/+$/, '').split('/').pop()?.toLowerCase() ?? ''
  if (!leaf.endsWith(SERVICE_AREA_SLUG_SUFFIX)) return ''
  const citySlug = leaf.slice(0, -SERVICE_AREA_SLUG_SUFFIX.length).replace(/^-+|-+$/g, '')
  if (!citySlug) return ''
  return titlecaseSlug(citySlug)
}
