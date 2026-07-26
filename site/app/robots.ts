import type {MetadataRoute} from 'next'
import {client} from '@/lib/sanity/client'
import {resolveHidden} from '@/lib/searchVisibility'

// VERCEL_ENV is set by Vercel: 'production' | 'preview' | 'development'.
// Preview deployments use unique URLs that Google can still crawl; emitting a
// Disallow rule there keeps preview content out of the index. Local builds
// (no VERCEL_ENV) fall through to production rules — robots.ts is rarely hit
// in local dev.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const isProduction = process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === 'production'
  const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'localhost:3000'
  const base = `https://${domain}`

  // Site-wide hide (ruled 2026-07-25) — same Disallow-all shape as a preview
  // build. FAIL-CLOSED: absent/unset resolves to hidden, so this is what a
  // freshly built client serves until an operator explicitly unhides it.
  const hidden = resolveHidden(
    await client.fetch<unknown>(`*[_type == "siteSettings"][0].hideFromSearch`),
  )

  if (!isProduction || hidden) {
    return {
      rules: [{userAgent: '*', disallow: '/'}],
      sitemap: `${base}/sitemap.xml`,
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/review/', '/design-studio/', '/design-preview/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
