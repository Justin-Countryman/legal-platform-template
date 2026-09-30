import Image from 'next/image'
import type {LogoFacts} from '@/lib/logoFacts'
import {logoAspect} from '@/lib/logoSize'

// ─── A logo, drawn from its ink (Phase 18 session B, items 3 and 4; monorepo `[R-603]`) ─────────────────────────────
//
// The box is the logo's trimmed rectangle (`logoFacts`): the file is drawn larger than the box and offset inside it, so
// only the ink shows. A crop by CSS, not by the image CDN, because the CDN ignores a crop on an SVG (ADV-18B-B); the
// file and its srcset are next/image's as before. The box takes a width and the ink's aspect ratio, never a fixed
// height, so a responsive width cap shrinks it whole.

export type LogoFile = {src: string; alt?: string | null; width: number; height: number; facts?: LogoFacts | null}

export function LogoImage({
  logo,
  height,
  alt,
  place,
  className = '',
  priority = false,
}: {
  logo: LogoFile
  /** The drawn height in pixels at the widest the box is allowed (`logoHeight`). */
  height: number
  alt: string
  /** Where it is drawn, for the tests and the measurements: `rest`, `compact`, `phone`, `footer`, `review`. */
  place: string
  className?: string
  priority?: boolean
}) {
  const aspect = logoAspect(logo)
  const t = logo.facts?.trim ?? null
  const inside = t
    ? {width: `${100 / t.width}%`, height: `${100 / t.height}%`, left: `${(-t.left / t.width) * 100}%`, top: `${(-t.top / t.height) * 100}%`}
    : {width: '100%', height: '100%', left: '0%', top: '0%'}
  return (
    <span
      data-logo-box={place}
      data-logo-height={Math.round(height * 10) / 10}
      className={`relative block shrink-0 overflow-hidden transition-[width] duration-structural-slow ease-balanced ${className}`}
      style={{width: `${height * aspect}px`, aspectRatio: `${aspect}`}}
    >
      <Image
        src={logo.src}
        alt={alt}
        width={logo.width}
        height={logo.height}
        priority={priority}
        className="absolute max-w-none"
        style={inside}
      />
    </span>
  )
}
