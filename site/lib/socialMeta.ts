import type {Metadata} from 'next'
import {hasImage, urlForImage, type SanityImage} from '@/lib/sanity/image'

// Builds the per-page `openGraph` + `twitter` metadata slice. Returns just the
// two keys so callers can spread the result into their existing
// `generateMetadata` return shape:
//
//   return {
//     title,
//     description,
//     alternates: {canonical: '/foo/'},
//     ...buildSocialMeta(title, description, page.ogImage),
//   }
//
// TWO SOURCES, in priority order (ruled 2026-07-25 — a per-page social image is
// intended behavior):
//   1. `ogImageOverride` on the page document, when the operator uploaded one.
//      Projected as `"ogImage": ogImageOverride ${IMAGE_FRAGMENT}`.
//   2. Otherwise the generated `/api/og?title=…` card. Unchanged, so a page
//      with no upload behaves exactly as it did before the override existed.
//
// The generated URL is relative and Next resolves it against `metadataBase`
// (`app/layout.tsx`). The override URL is an absolute Sanity CDN URL, which
// Next passes through untouched.
//
// Width AND height are both requested on the override so the builder honors the
// editor's crop + hotspot (see `lib/sanity/image.ts` — omitting either silently
// discards the focal point). 1200×630 is the size the field's own help text
// asks for, so a correctly-sized upload is not resampled.

export function buildSocialMeta(
  title: string | null | undefined,
  description: string | null | undefined,
  overrideImage?: SanityImage | null,
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const safeTitle = title ?? ''
  const safeDescription = description ?? ''
  const override = hasImage(overrideImage)
    ? urlForImage(overrideImage).width(1200).height(630).fit('crop').url()
    : null
  const ogImage = override ?? `/api/og?title=${encodeURIComponent(safeTitle)}`
  const alt = (override && overrideImage?.alt) || safeTitle
  return {
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      images: [{url: ogImage, width: 1200, height: 630, alt}],
    },
    twitter: {
      card: 'summary_large_image',
      title: safeTitle,
      description: safeDescription,
      images: [ogImage],
    },
  }
}
