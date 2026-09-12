/**
 * Marks a field the SITE reads at build time, so an editor knows Publish is
 * not enough.
 *
 * Monorepo `OUTSTANDING.md` item 240 (the Studio half, Phase 5, 2026-09-11):
 * flipping `siteSettings.hideFromSearch` and publishing changed the page meta
 * tag and nothing else, because the response header, `robots.txt` and the
 * sitemap are fixed when the site is built (`next.config.ts` `headers()`
 * reads it through `fetchSiteHiddenAtBuild`). Nothing in Studio said so.
 *
 * Two things at once, from one call, so they cannot drift apart:
 *   - `buildTime: true` on the field definition. Sanity's schema validator
 *     tolerates a custom property and the compiled type carries it (measured,
 *     WS-V1-PHASE5-DESIGN §9 item 8); `scripts/extract-field-map.ts` reads it
 *     into `field-map.json` for the platform repo. `sanity-augment.d.ts`
 *     declares it so `defineField` stays strictly typed.
 *   - The sentence appended to the description, because Studio renders
 *     nothing for a custom property and the editor is the audience.
 *
 * The census that found the build-time fields (2026-09-11, design §9 item 8)
 * found exactly one; add to it only from a `next.config.ts` or
 * `generateStaticParams` read, never from a guess.
 */

export const BUILD_TIME_SENTENCE =
  'Publishing changes only the page meta tag. The response header, robots.txt and the sitemap change at the next site build; the launch command rebuilds for you (SEARCH-3).'

export function buildTime(description: string): {buildTime: true; description: string} {
  return {buildTime: true, description: `${description} ${BUILD_TIME_SENTENCE}`}
}
