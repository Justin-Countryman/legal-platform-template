import {NextResponse} from 'next/server'
import type {NextRequest} from 'next/server'

// Proxy file convention (Next.js 16+ rename of "middleware" per
// nextjs.org/docs/messages/middleware-to-proxy).
//
// TWO JOBS, in this order:
//
// 1. Strip a trailing slash, once. Since 2026-09-11 ([R-185], item 271) the
//    site runs with `skipTrailingSlashRedirect: true`, so the framework no
//    longer redirects `/x/` to `/x` ahead of the redirect map (which cost every
//    legacy URL a second hop). The map's rules match both spellings and run
//    BEFORE this proxy (Next evaluates headers, then redirects, then the proxy),
//    so a legacy URL never reaches here; every OTHER slashed URL is sent to its
//    no-slash form here with one 308, which is what the framework used to do.
//    TECH-1's canonical shape is unchanged: the no-slash form serves.
// 2. Transparently rewrite /review-* URLs to the internal /review/[slug] route.
//    The browser URL never changes; review page slugs are always prefixed with
//    "review-" by convention (e.g. /review-us, /review-us-maple-grove).

export function stripTrailingSlashUrl(url: URL): URL | null {
  const {pathname} = url
  if (pathname.length <= 1 || !pathname.endsWith('/')) return null
  // A plain URL, not Next's NextURL: its pathname setter is the standard one
  // and `NextResponse.redirect` accepts either.
  const stripped = new URL(url.toString())
  stripped.pathname = pathname.replace(/\/+$/, '') || '/'
  return stripped
}

export function proxy(request: NextRequest) {
  const stripped = stripTrailingSlashUrl(request.nextUrl)
  if (stripped) return NextResponse.redirect(stripped, 308)

  const slug = request.nextUrl.pathname.slice(1) // strip leading "/" → "review-us"
  const url = request.nextUrl.clone()
  url.pathname = `/review/${slug}`
  return NextResponse.rewrite(url)
}

export const config = {
  // `/:path+/` — any path with a trailing slash (the strip). `/:slug(review-.+)`
  // — a named param with inline regex; matches /review-us, /review-us-city etc.
  matcher: ['/:path+/', '/:slug(review-.+)'],
}
