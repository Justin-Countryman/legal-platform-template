import type {MetadataRoute} from 'next'

// VERCEL_ENV is set by Vercel: 'production' | 'preview' | 'development'.
// Preview deployments use unique URLs that Google can still crawl; emitting a
// Disallow rule there keeps preview content out of the index. Local builds
// (no VERCEL_ENV) fall through to production rules — robots.ts is rarely hit
// in local dev.
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === 'production'
  const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'localhost:3000'
  const base = `https://${domain}`

  if (!isProduction) {
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
