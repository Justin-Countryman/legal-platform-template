import {cache} from 'react'
import {client} from './client'
import {HOME_PAGE_QUERY, CATCH_ALL_PAGE_QUERY, SITE_CHROME_QUERY} from './queries'

// ─── One fetch per request, shared across generateMetadata, the layouts and
// the page ────────────────────────────────────────────────────────────────────
//
// React `cache()` memoizes a function for the life of ONE server request,
// across every server component and `generateMetadata` in the render tree.
// Next's own `fetch` memoization would do this for a GET, but `@sanity/client`
// sends a query over 11,264 encoded characters as POST (every page query here
// is), and POST is never memoized: until 2026-09-13 the catch-all route sent
// its page query twice and the chrome was fetched from ten places (monorepo
// WS-V1-PHASE8-DESIGN §0, §7.2). Measured on a production build against the
// stub Content Lake: a cold hit is two Sanity calls, the chrome and the page.
//
// WHAT `cache()` DOES NOT COVER, measured, so nobody rediscovers it:
//   - a route handler (`robots.ts`, `sitemap.ts`, `app/api/*`): no render
//     tree, no memo. They keep their own single-purpose queries.
//   - the not-found pass: `notFound()` renders the boundary in a SECOND request
//     scope, so a miss fetches the chrome twice (about four calls, not two).
//   - `next dev`, which memoizes nothing.
//   - a second `cache()` wrapper of the same function: each call to `cache` is
//     its own cache. Every fetcher lives here, once.
//   - an object argument: keys compare by `Object.is`, so `fetchCached` takes
//     the slug as a string, never `{slug}`.
//
// Nothing here passes `cache:` or `next:` to the transport. Fetches stay
// uncached at the fetch layer, so a `revalidatePath` re-renders from live data
// and the Full Route Cache (`revalidate = 3600` per route, the webhook's
// layout-wide invalidation) is the only cache to keep in step.

/** The site chrome: layouts, robots decision, NAP tokens, global CTA. One call per request. */
export const getSiteChrome = cache(() => client.fetch(SITE_CHROME_QUERY))

/** The catch-all page for one slug, shared by generateMetadata and the page. */
export const getCatchAllPage = cache((slug: string) => client.fetch(CATCH_ALL_PAGE_QUERY, {slug}))

/** The homepage: content, metadata and the hero's design half in one request. */
export const getHomePage = cache(() => client.fetch(HOME_PAGE_QUERY))

// The other routes' page queries all take either no parameter or `$slug`, so one
// memoized fetch keyed on (query text, slug) covers them. `T` is the caller's
// claim about the shape, exactly as `client.fetch<T>` was.
const cachedQuery = cache((query: string, slug?: string) =>
  client.fetch(query, slug === undefined ? {} : {slug}),
)

// The default is `any` because that is what `client.fetch(query)` returned to
// the same call sites; a route that wants a type states one, as before.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fetchCached<T = any>(query: string, slug?: string): Promise<T> {
  return cachedQuery(query, slug) as Promise<T>
}

// The chrome's parts, for routes that read one of them. Each is the same one
// request; the destructure is free.
export async function chromeNap() {
  return (await getSiteChrome())?.nap ?? null
}
export async function chromeGlobalCta() {
  return (await getSiteChrome())?.globalCta ?? null
}
export async function chromeDesignTokens() {
  return (await getSiteChrome())?.designTokens ?? null
}
export async function chromeHeader() {
  return (await getSiteChrome())?.header ?? null
}
