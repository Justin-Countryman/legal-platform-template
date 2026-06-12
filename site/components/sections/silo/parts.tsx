import Image from 'next/image'
import Link from 'next/link'
import {MdArrowForward} from 'react-icons/md'
import type {SiloHoverClasses} from '@/lib/siloHover'
import type {SiloNavItem} from './types'

// ─── Shared silo-tile primitives ────────────────────────────────────────────────
// Every button layout composes these, so the hover system, a11y, and surface
// handling are wired identically across all six. `fx` is the resolved hover-class
// bundle (from siloHover) — each primitive splices its own layer.

const CARD_SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw'
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus'

/** Nav landmark + list. Every layout is a `<nav aria-label>` over a `<ul role=list>`.
 *  The `@container` makes the grid count columns off the nav's OWN width — so a card
 *  renders 3-up full-bleed, 2-up inside an Aside column, etc. — keeping the section
 *  layout and button layout fully independent (and enabling bento cells later). */
export function SiloNav({ariaLabel, className, children}: {ariaLabel: string; className: string; children: React.ReactNode}) {
  return (
    <nav aria-label={ariaLabel} className="@container">
      <ul role="list" className={className}>
        {children}
      </ul>
    </nav>
  )
}

/** Whole-tile link: the focus-ring contract + group + relative are always present.
 *  `dark` flips the ring-context (image tiles render white text over the scrim). */
export function TileLink({
  href, dark, className, children, press = 'scale',
}: {
  href: string
  dark?: boolean
  className: string
  children: React.ReactNode
  /** Touch press feedback. 'scale' (default) presses the whole card down — right for
   *  cards. 'wash' tints the background instead — right for full-width list rows,
   *  where a scale would gap the row inside its divider/border. */
  press?: 'scale' | 'wash'
}) {
  // Hover effects never fire on touch, so a tap needs its own feedback.
  // scale: standard `transition-transform` eases the scale (Tailwind-v4 caveat) and
  // composes with any lift effect. wash: a subtle bg tint on press.
  const pressClass =
    press === 'wash'
      ? 'transition-colors duration-ui-fast active:bg-foreground/[0.06]'
      : 'transition-transform duration-ui-fast ease-gentle active:scale-95'
  return (
    <Link
      href={href}
      data-ring-context={dark ? 'dark' : undefined}
      className={`group relative overflow-hidden ${pressClass} ${FOCUS} ${className}`}
    >
      {children}
    </Link>
  )
}

/** Background photo + bottom-heavy legibility scrim (image layouts). Base transitions
 *  scale + filter so Image Zoom and Grayscale ease. Renders nothing without an image.
 *  `scrim={false}` for a photo PANEL that carries no overlaid text (Split). */
export function TileImage({item, fx, scrim = true}: {item: SiloNavItem; fx: SiloHoverClasses; scrim?: boolean}) {
  if (!item.image?.src) return null
  return (
    <>
      <Image
        src={item.image.src}
        alt=""
        aria-hidden="true"
        fill
        sizes={CARD_SIZES}
        className={`object-cover transition-[scale,filter] duration-ui-slow ease-gentle ${fx.image}`}
      />
      {scrim && (
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-brand-dark/95 via-brand-dark/55 to-brand-dark/30" />
      )}
    </>
  )
}

/** Subtle adaptive fill so a no-image tile still reads designed. */
export function TileFill() {
  return <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent" />
}

/** Accent glow overlay (Glow preset). Universal; fades in only when selected. */
export function TileGlow({fx}: {fx: SiloHoverClasses}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-action/30 to-action/10 opacity-0 transition-opacity duration-ui-base ease-gentle ${fx.glow}`}
    />
  )
}

/** Top accent-border overlay (Accent Border preset) — sits above the image/scrim/glow. */
export function TileBorder({fx}: {fx: SiloHoverClasses}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-20 rounded-ui border-2 border-transparent transition-colors duration-ui-base ease-gentle ${fx.border}`}
    />
  )
}

/** Icon chip. `onImage` → solid white badge (reads over a photo); else accent-tinted.
 *  Renders nothing without an icon (graceful degrade). */
export function TileIcon({
  item, fx, onImage, size = 'md',
}: {
  item: SiloNavItem
  fx: SiloHoverClasses
  onImage?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  if (!item.icon?.src) return null
  const chip = size === 'lg' ? 'size-16' : size === 'sm' ? 'size-10' : 'size-12'
  const glyph = size === 'lg' ? 'size-9' : size === 'sm' ? 'size-5' : 'size-7'
  return (
    <span
      className={[
        'grid shrink-0 place-items-center rounded-md transition-transform duration-ui-base ease-gentle',
        chip,
        onImage ? 'bg-white/90' : 'bg-action/10',
        fx.icon,
      ].join(' ')}
    >
      <Image src={item.icon.src} alt="" aria-hidden="true" width={36} height={36} className={`${glyph} object-contain`} />
    </span>
  )
}

/** Practice-area name (always present) + optional accent underline (Accent Underline preset). */
export function TileLabel({
  item, fx, className, center,
}: {
  item: SiloNavItem
  fx: SiloHoverClasses
  className?: string
  center?: boolean
}) {
  return (
    <div className={center ? 'flex flex-col items-center' : undefined}>
      <h3 className={className ?? 'font-heading text-xl font-semibold leading-tight tracking-tight text-foreground md:text-2xl'}>
        {item.label}
      </h3>
      {fx.underline && (
        <span
          aria-hidden="true"
          className={`mt-2 block h-0.5 w-10 ${center ? 'origin-center' : 'origin-left'} scale-x-0 bg-action transition-transform duration-ui-base ease-gentle ${fx.underline}`}
        />
      )}
    </div>
  )
}

/** Short blurb (Feature / Brief / Inline). Renders nothing when unset. */
export function TileBlurb({item, className}: {item: SiloNavItem; className?: string}) {
  if (!item.description) return null
  return <p className={className ?? 'text-sm leading-relaxed text-foreground-muted line-clamp-2'}>{item.description}</p>
}

/** Static arrow affordance (it shifts only under the movement hover presets). */
export function TileArrow({fx, className}: {fx: SiloHoverClasses; className?: string}) {
  return (
    <MdArrowForward
      aria-hidden="true"
      className={`shrink-0 text-foreground-subtle transition-transform duration-ui-base ease-gentle ${fx.arrow} ${className ?? 'size-6'}`}
    />
  )
}
