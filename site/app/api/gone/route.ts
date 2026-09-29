/**
 * The answer every retired URL gets: 410 Gone (`lib/retired.ts`). A plain page
 * with a link home and no site header or footer: a route handler has no
 * layout, and a page render cannot answer 410 (Justin, 2026-09-29, the plain
 * page over the site's look with a proxy on every request).
 *
 * Cached at the CDN for a day, like the site's other static answers; never
 * indexed. A handler answering 400 or above is never prerendered, so this runs
 * on the first request for each path and is cached after it.
 */

import {GONE_HEADERS, GONE_HTML} from '@/lib/gone'

export function GET(): Response {
  return new Response(GONE_HTML, {status: 410, headers: GONE_HEADERS})
}

export function HEAD(): Response {
  return new Response(null, {status: 410, headers: GONE_HEADERS})
}
