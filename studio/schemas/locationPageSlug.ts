/**
 * The `locationPage` Generate button, in its own module so a check can reach it.
 *
 * SLUG-1 (`BI/rules/urls.md`) and TITLE-11 (`BI/rules/page-titles.md`) rule the
 * slug `{city}-law-firm`. NAME-4 rules the Name `{city} Law Office`. The two
 * diverge on purpose — `BE/_shared/location_page.py` states it at length — so a
 * button that slugifies the Page Title produces the wrong URL by construction.
 *
 * THAT IS WHAT IT DID UNTIL 2026-08-10. The field carried
 * `options: {source: 'title'}`, its own description said "Click Generate after
 * setting Page Title", and Generate answered `{city}-law-office`. The row's
 * detector cell in `BI/rules/urls.md` reads `nothing`, ruled an accepted absence
 * on 2026-08-04, so nothing on the platform noticed. The BUILD path never shared
 * the defect: Site-Build's `page_creation.py` and Site-Prep's shell writer both
 * take the address from the `CS-SITEMAP.csv` cell and derive nothing.
 *
 * THE CITY COMES FROM THE `location` RECORD, NEVER FROM THE TITLE OR THE SLUG.
 * A `locationPage` has a real record carrying city and state, which is why
 * `location_page.py` takes a city rather than a slug. A caller that cannot reach
 * the record answers nothing rather than guessing — `BI-FOUNDATIONS.md`, "a tool
 * does not name what it cannot know" — and an empty answer here leaves the field
 * empty, which its own `required().error()` then blocks.
 *
 * It lives beside `seoTitle.ts` and `metaDescription.ts` for the same reason
 * they do: the document schema imports a `.tsx` input component, so a node
 * script cannot import the schema module, and a rule a script must exercise
 * therefore lives in a module of its own.
 *
 * Detected by: `studio/scripts/verify-location-page-slug-source.ts`.
 */

/** The ruled suffix, written once. */
export const LOCATION_PAGE_SLUG_SUFFIX = '-law-firm'

type SlugSourceContext = {
  getClient: (options: {apiVersion: string}) => {
    fetch: (query: string, params: Record<string, unknown>) => Promise<unknown>
  }
}

export async function locationPageSlugSource(
  doc: unknown,
  {getClient}: SlugSourceContext,
): Promise<string> {
  const {locationRef} = (doc ?? {}) as {locationRef?: {_ref?: string}}
  const ref = locationRef?._ref
  if (!ref) return ''

  const client = getClient({apiVersion: '2024-01-01'})
  const city = await client.fetch(`*[_id == $id][0].city`, {id: ref})
  if (typeof city !== 'string') return ''

  const citySlug = city.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return citySlug ? `${citySlug}${LOCATION_PAGE_SLUG_SUFFIX}` : ''
}
