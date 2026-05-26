import type {Metadata} from 'next'

// Builds the per-page `openGraph` + `twitter` metadata slice with a
// title-aware `/api/og` image URL. Returns just the two keys so callers can
// spread the result into their existing `generateMetadata` return shape:
//
//   return {
//     title,
//     description,
//     alternates: {canonical: '/foo/'},
//     ...buildSocialMeta(title, description),
//   }
//
// The OG URL is a relative path; Next.js resolves it against
// `metadataBase` (set in `app/layout.tsx`).

export function buildSocialMeta(
  title: string | null | undefined,
  description: string | null | undefined,
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const safeTitle = title ?? ''
  const safeDescription = description ?? ''
  const ogImage = `/api/og?title=${encodeURIComponent(safeTitle)}`
  return {
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      images: [{url: ogImage, width: 1200, height: 630, alt: safeTitle}],
    },
    twitter: {
      card: 'summary_large_image',
      title: safeTitle,
      description: safeDescription,
      images: [ogImage],
    },
  }
}
