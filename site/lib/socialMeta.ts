import type {Metadata} from 'next'
import {hasImage, urlForImage, type SanityImage} from '@/lib/sanity/image'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'

// Builds the per-page `openGraph` + `twitter` metadata slice. Returns just the
// two keys so callers can spread the result into their existing
// `generateMetadata` return shape:
//
//   return {
//     title,
//     description,
//     alternates: {canonical: '/foo/'},
//     ...buildSocialMeta(label, description, page.ogImage, {
//       ogTitle: page?.ogTitle, ogDescription: page?.ogDescription, tokens,
//     }),
//   }
//
// The first two arguments are the FALLBACKS — the Search title's label and the
// meta description. The fourth carries the per-page overrides that sit above
// them (item 91). Passing no fourth argument is the pre-2026-08-09 behaviour
// and is still correct for a page type that has no override fields.
//
// `twitter.card` is emitted unconditionally below as `summary_large_image`, so
// every page gets a large-image card rather than the small default a missing
// tag produces. Verified emitted rather than assumed: see
// `lib/__tests__/socialMeta.test.ts`.
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

/**
 * The UNTITLED generated card the root layout emits sitewide, as a path.
 *
 * It lives here rather than as a literal in `app/layout.tsx` because a second
 * caller now needs the same value: TECH-3 rules the homepage's card in and rules
 * its no-upload IMAGE out of that change — with no `ogImageOverride` the
 * homepage's image must stay byte-identical to this one. Next REPLACES
 * `openGraph` across segments rather than merging it, so a route that emits a
 * card at all must restate the image it wants to keep, and restating a literal
 * in two files is how the two drift.
 */
export const SITEWIDE_OG_IMAGE_URL = '/api/og'

/**
 * The per-page social overrides, as they come off the page document.
 *
 * `tokens` is here because these are token-bearing text fields like every other
 * authored string on the platform — an operator may write `{{primaryCity}}` in
 * a share title and expect it resolved, the same way the Search title resolves
 * it.
 */
export type SocialOverrides = {
  ogTitle?: string | null
  ogDescription?: string | null
  tokens?: NapTokens | null
}

/**
 * The social title/description ladder. ONE rung, then the fallback.
 *
 * NAME-1 rules that the social share title IS the Search title, and that stays
 * the default. `OUTSTANDING.md` item 91 (ruled 2026-08-07) added the override
 * above it and amended NAME-1 to read "the Search title unless an override is
 * set". Blank is the normal state and no tool writes either field, so the
 * fallback is what runs on essentially every page.
 *
 * Trimmed before the emptiness test, so a field cleared to spaces in Studio
 * falls back rather than emitting a blank card title.
 */
function resolveOverride(
  override: string | null | undefined,
  fallback: string | null | undefined,
  tokens: NapTokens | null | undefined,
): string {
  const resolved = resolveTokenString(override, tokens).trim()
  if (resolved) return resolved
  return fallback ?? ''
}

export function buildSocialMeta(
  title: string | null | undefined,
  description: string | null | undefined,
  overrideImage?: SanityImage | null,
  overrides?: SocialOverrides | null,
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const safeTitle = resolveOverride(
    overrides?.ogTitle, title, overrides?.tokens)
  const safeDescription = resolveOverride(
    overrides?.ogDescription, description, overrides?.tokens)
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
