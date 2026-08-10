import type {MetadataRoute} from 'next'
import {client} from '@/lib/sanity/client'
import {SITEMAP_QUERY} from '@/lib/sanity/queries'
import {resolveHidden} from '@/lib/searchVisibility'
import {siteOrigin} from '@/lib/siteHost'

type SanityNode = {slug: string; _updatedAt: string}
type SingletonNode = {_updatedAt: string; noIndex: boolean} | null
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
  contact: SingletonNode
  attorneys: SanityNode[]
  staff: SanityNode[]
  blogPosts: SanityNode[]
  blogCategories: SanityNode[]
  events: SanityNode[]
  catchAll: SanityNode[]
  hideFromSearch?: unknown
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

  // Site-wide hide (ruled 2026-07-25). A hidden site emits an EMPTY sitemap —
  // listing URLs a noindex header is simultaneously suppressing would just
  // invite crawls of pages we are telling crawlers to drop. FAIL-CLOSED: absent
  // or unset resolves to hidden, so a freshly built client ships empty until an
  // operator explicitly unhides. Rule: lib/searchVisibility.ts.
  if (resolveHidden(data.hideFromSearch)) return []

  const base = siteOrigin()
  const buildDate = new Date()

  const entries: MetadataRoute.Sitemap = []

  const push = (path: string, lastModified: string | Date | undefined, priority: number) => {
    entries.push({
      url: `${base}${path}`,
      lastModified: lastModified ? new Date(lastModified) : buildDate,
      priority,
    })
  }

  // TECH-6 AT FULL SCOPE (ruled 2026-08-10, `OUTSTANDING.md` item 161). A page
  // carrying `noIndex` never appears here, on any type, with no exceptions —
  // which is the argument the site-wide branch above already makes and which
  // this route applied to one singleton in eight until this build.
  //
  // Absent is not hidden. `/` and `/contact` are served whether or not their
  // singleton exists, so a MISSING document still lists the URL; only an
  // explicit `noIndex` drops it. The seven index routes keep their existing
  // "no document, no route entry" guard, and the filter rides alongside it.
  const listed = (n: SingletonNode) => n?.noIndex !== true

  // Static / index routes (priority 1.0 for home, 0.8 for index pages)
  if (listed(data.home)) push('/', data.home?._updatedAt, 1.0)
  if (data.attorneyIndex && listed(data.attorneyIndex)) push('/attorneys', data.attorneyIndex._updatedAt, 0.8)
  if (data.staffIndex && listed(data.staffIndex)) push('/staff', data.staffIndex._updatedAt, 0.8)
  if (data.blogIndex && listed(data.blogIndex)) push('/blog', data.blogIndex._updatedAt, 0.8)
  if (data.eventIndex && listed(data.eventIndex)) push('/events', data.eventIndex._updatedAt, 0.8)
  if (data.serviceAreaIndex && listed(data.serviceAreaIndex)) push('/service-area', data.serviceAreaIndex._updatedAt, 0.8)
  if (data.videoIndex && listed(data.videoIndex)) push('/videos', data.videoIndex._updatedAt, 0.8)
  if (data.testimonials && listed(data.testimonials)) push('/testimonials', data.testimonials._updatedAt, 0.6)
  // `/contact` was pushed blind until 2026-08-10 — no document fetched, so its
  // own `noIndex` was unreadable. `contactPage` is in the query now and supplies
  // a real `lastModified` as well.
  if (listed(data.contact)) push('/contact', data.contact?._updatedAt, 0.7)

  // Collection routes — every stored slug is the full URL path
  for (const n of data.attorneys) push(`/${n.slug}`, n._updatedAt, 0.7)
  for (const n of data.staff) push(`/${n.slug}`, n._updatedAt, 0.6)
  for (const n of data.blogPosts) push(`/${n.slug}`, n._updatedAt, 0.6)
  for (const n of data.blogCategories) push(`/${n.slug}`, n._updatedAt, 0.5)
  for (const n of data.events) push(`/${n.slug}`, n._updatedAt, 0.5)
  for (const n of data.catchAll) push(`/${n.slug}`, n._updatedAt, 0.7)

  return entries
}
