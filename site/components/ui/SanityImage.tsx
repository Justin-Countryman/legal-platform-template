import NextImage from 'next/image'
import {imageLoader} from 'next-sanity/image'
import {urlForImage, sanityObjectPosition, hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'

// ─── Shared Sanity image renderer ─────────────────────────────────────────────
// The ONE place Sanity images are rendered. Three modes:
//   • fixed   — exact width×height; the CDN crops to that ratio centered on the
//     editor's hotspot/crop (both dims set ⇒ the builder honors them).
//   • fill    — the parent box (CSS aspect) sets the shape; object-cover + an
//     object-position derived from the hotspot keeps the subject in frame.
//   • natural — intrinsic ratio, NO crop (object-contain by default). For photos
//     shown whole (profile headshots) — hotspot/crop irrelevant, but still gets
//     format negotiation + LQIP. Uses the projected dimensions for layout.
// All get LQIP blur-up (when projected) and serve format-negotiated CDN URLs via
// next-sanity's imageLoader. Renders nothing when the image has no asset.
//
// Requires the image to be projected with IMAGE_FRAGMENT (asset ref + hotspot +
// crop + lqip + dimensions). `alt` falls back to the projected alt, then ''.

type CommonProps = {
  image?: SanityImageData | null
  alt?: string
  className?: string
  sizes?: string
  priority?: boolean
  quality?: number
}

type Props = CommonProps &
  (
    | {mode: 'fixed'; width: number; height: number}
    | {mode: 'fill'; width?: never; height?: never}
    | {mode: 'natural'; width?: number; height?: number}
  )

export function SanityImage(props: Props) {
  const {image, alt, className, sizes, priority, quality} = props
  if (!hasImage(image)) return null

  const altText = alt ?? image.alt ?? ''
  const blur = image.lqip ? ({placeholder: 'blur', blurDataURL: image.lqip} as const) : {}

  if (props.mode === 'fixed') {
    const {width, height} = props
    const src = urlForImage(image).width(width).height(height).fit('crop').url()
    return (
      <NextImage
        loader={imageLoader}
        src={src}
        alt={altText}
        width={width}
        height={height}
        className={className}
        sizes={sizes}
        priority={priority}
        quality={quality}
        {...blur}
      />
    )
  }

  if (props.mode === 'natural') {
    // Intrinsic ratio, no crop. Fall back to the projected dimensions for the
    // layout box (next/image needs width+height); default 800×800 if absent.
    const width = props.width ?? image.dimensions?.width ?? 800
    const height = props.height ?? image.dimensions?.height ?? 800
    const src = urlForImage(image).url()
    return (
      <NextImage
        loader={imageLoader}
        src={src}
        alt={altText}
        width={width}
        height={height}
        className={className}
        sizes={sizes}
        priority={priority}
        quality={quality}
        {...blur}
      />
    )
  }

  // fill: no fixed dimensions, so the builder can't crop — the CSS box + hotspot
  // object-position handle framing. The loader sizes the bytes per breakpoint.
  const src = urlForImage(image).url()
  return (
    <NextImage
      loader={imageLoader}
      src={src}
      alt={altText}
      fill
      className={className}
      style={{objectFit: 'cover', objectPosition: sanityObjectPosition(image)}}
      sizes={sizes}
      priority={priority}
      quality={quality}
      {...blur}
    />
  )
}
