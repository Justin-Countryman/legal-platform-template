import {NextResponse} from 'next/server'
import type {NextRequest} from 'next/server'

// Proxy file convention (Next.js 16+ rename of "middleware" per
// nextjs.org/docs/messages/middleware-to-proxy).
//
// Transparently rewrites /review-* URLs to the internal /review/[slug] route.
// The browser URL never changes — this is purely a server-side rewrite.
// Review page slugs are always prefixed with "review-" by convention
// (e.g. /review-us, /review-us-maple-grove).

export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice(1) // strip leading "/" → "review-us"
  const url = request.nextUrl.clone()
  url.pathname = `/review/${slug}`
  return NextResponse.rewrite(url)
}

export const config = {
  // /:slug(review-.+) — named param with inline regex; matches /review-us, /review-us-city etc.
  matcher: ['/:slug(review-.+)'],
}
