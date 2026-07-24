import type {MetadataRoute} from 'next'
import {client} from '@/lib/sanity/client'
import {SITEMAP_QUERY} from '@/lib/sanity/queries'

type SanityNode = {slug: string; _updatedAt: string}
type SingletonNode = {_updatedAt: string} | null
type SitemapData = {
  domain?: string | null
  home: SingletonNode
  attorneyIndex: SingletonNode
  staffIndex: SingletonNode
  blogIndex: SingletonNode
  eventIndex: SingletonNode
  serviceAreaIndex: SingletonNode
  videoIndex: SingletonNode
  testimonials: SingletonNode
  attorneys: SanityNode[]
  staff: SanityNode[]
  blogPosts: SanityNode[]
  blogCategories: SanityNode[]
  events: SanityNode[]
  catchAll: SanityNode[]
}

// Slug-to-URL mapping. URLs emit WITHOUT a trailing slash to match
// Next.js's default `trailingSlash: false` canonical form (and avoid an
// unnecessary 308 hop on every crawl).
//
// Single slug convention (ruled, item 69): EVERY type stores the whole URL
// path in `slug.current` — `attorneys/jane-doe`, `blog/foo`, `staff/jane-doe`,
// `events/open-house`, `blog/category/family-law`. The stored slug IS the URL;
// nothing here (or anywhere) prepends a prefix onto a stored slug. What an
// operator sees in Studio is what the URL is.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await client.fetch<SitemapData>(SITEMAP_QUERY)
  const domain = data.domain ?? process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'localhost:3000'
  const base = `https://${domain}`
  const buildDate = new Date()

  const entries: MetadataRoute.Sitemap = []

  const push = (path: string, lastModified: string | Date | undefined, priority: number) => {
    entries.push({
      url: `${base}${path}`,
      lastModified: lastModified ? new Date(lastModified) : buildDate,
      priority,
    })
  }

  // Static / index routes (priority 1.0 for home, 0.8 for index pages)
  push('/', data.home?._updatedAt, 1.0)
  if (data.attorneyIndex) push('/attorneys', data.attorneyIndex._updatedAt, 0.8)
  if (data.staffIndex) push('/staff', data.staffIndex._updatedAt, 0.8)
  if (data.blogIndex) push('/blog', data.blogIndex._updatedAt, 0.8)
  if (data.eventIndex) push('/events', data.eventIndex._updatedAt, 0.8)
  if (data.serviceAreaIndex) push('/service-area', data.serviceAreaIndex._updatedAt, 0.8)
  if (data.videoIndex) push('/videos', data.videoIndex._updatedAt, 0.8)
  if (data.testimonials) push('/testimonials', data.testimonials._updatedAt, 0.6)
  // /contact is dedicated (no singleton _updatedAt fetched); use build time.
  push('/contact', undefined, 0.7)

  // Collection routes — every stored slug is the full URL path
  for (const n of data.attorneys) push(`/${n.slug}`, n._updatedAt, 0.7)
  for (const n of data.staff) push(`/${n.slug}`, n._updatedAt, 0.6)
  for (const n of data.blogPosts) push(`/${n.slug}`, n._updatedAt, 0.6)
  for (const n of data.blogCategories) push(`/${n.slug}`, n._updatedAt, 0.5)
  for (const n of data.events) push(`/${n.slug}`, n._updatedAt, 0.5)
  for (const n of data.catchAll) push(`/${n.slug}`, n._updatedAt, 0.7)

  return entries
}
