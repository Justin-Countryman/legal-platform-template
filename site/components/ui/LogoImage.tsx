import Image from 'next/image'
import type {LogoFacts} from '@/lib/logoFacts'
import {logoAspect} from '@/lib/logoSize'

// ─── A logo, drawn from its ink (Phase 18 session B, items 3 and 4; monorepo `[R-603]`) ─────────────────────────────
//
// The box is the logo's trimmed rectangle (`logoFacts`): the file is drawn larger than the box and offset inside it, so
// only the ink shows. A crop by CSS, not by the image CDN, because the CDN ignores a crop on an SVG (ADV-18B-B); the
// file and its srcset are next/image's as before. The box takes a width and the ink's aspect ratio, never a fixed
// height, so a responsive width cap shrinks it whole. `blend` draws a white box into a solid light ground (`multiply`)
// or a black one into a solid dark ground (`screen`), so the box disappears into the color behind it and the page keeps
// its own (item 4; ADV-18B-B measured a white box on a cream header ΔE 8.60 before and 0.00 after, the ink moving 0.7 to
// 3.0 on cream, like print on cream paper). Only a solid ground in the same stacking context blends.

export type LogoFile = {src: string; alt?: string | null; width: number; height: number; facts?: LogoFacts | null}

/** How a logo is drawn into a solid ground of this polarity: a white box multiplied into a light one, a black box
 *  screened into a dark one; nothing for a clear file, a colored box, or a box of the other polarity. */
export function logoBlend(logo: {facts?: LogoFacts | null} | null | undefined, ground: 'light' | 'dark'): 'multiply' | 'screen' | null {
  const box = logo?.facts?.box
  if (box === 'white' && ground === 'light') return 'multiply'
  if (box === 'black' && ground === 'dark') return 'screen'
  return null
}

/** A glass or transparent header scheme's solid form in its own polarity. */
const SOLID_FORM: Record<string, 'light' | 'dark'> = {glass: 'light', 'transparent-light': 'light', 'glass-dark': 'dark', 'transparent-dark': 'dark'}

/** A header scheme as the site shell hands it on: its solid form where the logo drawn in that state carries a box that
 *  blends into the solid ground (`logoBlend`), which only a solid ground allows; else unchanged, a colored box or a box
 *  of the other polarity included (a solid bar would not hide it). */
export function solidBehindBox(scheme: string, drawn: {src?: string | null; facts?: LogoFacts | null} | null | undefined): string {
  const solid = SOLID_FORM[scheme]
  return solid && drawn?.src && logoBlend(drawn, solid) ? solid : scheme
}

export function LogoImage({
  logo,
  height,
  alt,
  place,
  className = '',
  blend = null,
  priority = false,
}: {
  logo: LogoFile
  /** The drawn height in pixels at the widest the box is allowed (`logoHeight`). */
  height: number
  alt: string
  /** Where it is drawn, for the tests and the measurements: `rest`, `compact`, `phone`, `footer`, `review`. */
  place: string
  className?: string
  blend?: 'multiply' | 'screen' | null
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
        className={blend === 'multiply' ? 'absolute max-w-none mix-blend-multiply' : blend === 'screen' ? 'absolute max-w-none mix-blend-screen' : 'absolute max-w-none'}
        style={inside}
      />
    </span>
  )
}
