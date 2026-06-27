import createImageUrlBuilder from '@sanity/image-url'

// ─── Sanity image pipeline ────────────────────────────────────────────────────
// One place that turns a projected Sanity image into a CDN URL that HONORS the
// editor's crop + hotspot. The builder reads `crop`/`hotspot` automatically as
// long as the full image object (asset ref + crop + hotspot) is projected and
// BOTH width and height are requested — so callers must use IMAGE_FRAGMENT in
// GROQ and the <SanityImage> component to render. Never call `.crop('focalpoint')`
// or `.focalPoint()` here: those OVERRIDE the editor's stored choices.

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!

const builder = createImageUrlBuilder({projectId, dataset})

// The builder's accepted source type, derived from the builder itself to avoid a
// fragile deep type-import path.
type ImageSource = Parameters<typeof builder.image>[0]

/** Base builder for a projected Sanity image. `.auto('format')` negotiates
 *  WebP/AVIF per request; callers add `.width()/.height()/.fit('crop')`. */
export function urlForImage(source: ImageSource) {
  return builder.image(source).auto('format')
}

// The shape IMAGE_FRAGMENT projects. `asset` keeps the raw reference so the URL
// builder can resolve crop/hotspot; `lqip`/`dimensions` are dereffed siblings.
export type SanityImage = {
  asset?: {_ref?: string | null; _type?: string} | null
  hotspot?: {x: number; y: number} | null
  crop?: {top: number; bottom: number; left: number; right: number} | null
  alt?: string | null
  /** Custom hero "fit" field (cover/tile) — present only on hero/background images. */
  fit?: 'cover' | 'tile' | null
  lqip?: string | null
  dimensions?: {width?: number | null; height?: number | null; aspectRatio?: number | null} | null
}

/** A projected image is renderable only when it carries an asset reference. */
export function hasImage(image?: SanityImage | null): image is SanityImage & {asset: {_ref: string}} {
  return !!image?.asset?._ref
}

/** CSS object-position from the hotspot (0–1 → %), for fill/object-cover renders
 *  where the CSS box aspect may differ from the requested crop. Defaults center. */
export function sanityObjectPosition(image?: SanityImage | null): string {
  const h = image?.hotspot
  if (!h || typeof h.x !== 'number' || typeof h.y !== 'number') return '50% 50%'
  return `${(h.x * 100).toFixed(2)}% ${(h.y * 100).toFixed(2)}%`
}
