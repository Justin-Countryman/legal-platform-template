'use client'

// Shared internal-hero foreground subject: a right-aligned standing figure
// (e.g. attorney, building) shown in full color ABOVE the scrim (z-10). Forms a
// two-column layout with the left-aligned heading at lg+; hidden below lg so
// mobile stays text-first. Rendered identically by InternalHero and
// InternalPageHeader (the no-hero band) so site defaults appear site-wide.
//
// The foreground column of the hero's two-column layout (lg+). It is a child of
// the hero content container (the SAME frame as the heading column), anchored to
// the container's right edge as a fixed BOX (width/height/inset from the shared
// CSS vars set by heroForegroundVars()). The image is object-contain + bottom-
// right aligned within the box, so it is aspect-robust: a tall cut-out fills the
// box height and bleeds off the BOTTOM (box height > band height, clipped by the
// section's overflow-hidden); a wide cut-out is width-capped (never crowds the
// heading or runs off the right) and sits shorter — grounded bottom-right either
// way. The heading column reserves space via the globals.css rule keyed off the
// same vars, so the two never overlap. Renders nothing without a foreground.

import Image from 'next/image'
import type {ResolvedHeroSurface} from '@/lib/heroSurface'

export function HeroForeground({surface}: {surface: ResolvedHeroSurface}) {
  if (!surface.hasForeground || !surface.foreground?.src) return null
  const fg = surface.foreground

  return (
    <div
      className="pointer-events-none absolute top-0 z-10 hidden lg:block"
      // Box geometry from the container's shared CSS vars (heroForegroundVars()):
      // width/height/right inset stay in sync with the heading-column reservation.
      style={{
        right: 'var(--hero-fg-inset)',
        width: 'var(--hero-fg-col)',
        height: 'var(--hero-fg-h)',
      }}
      data-testid="hero-foreground"
    >
      <Image
        src={fg.src}
        alt={fg.alt ?? ''}
        width={fg.width ?? 800}
        height={fg.height ?? 1000}
        // Contain within the box, grounded bottom-right — aspect-robust: height
        // wins for tall cut-outs (bleed), the box width caps wide ones.
        className="h-full w-full object-contain object-right-bottom"
        sizes="(min-width: 992px) 38vw, 0px"
      />
    </div>
  )
}
