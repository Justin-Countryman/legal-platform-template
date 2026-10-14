'use client'

// Shared internal-hero background surface: full-bleed image (cover) or tiled
// pattern, with a configurable brand-dark scrim above it. Rendered identically
// by InternalHero and InternalPageHeader so the two never diverge. Sits at z-0
// (below the z-10 content). Renders nothing when the resolved surface has no
// image — the section/header element paints its own solid bg in that case.

import Image from 'next/image'
import {heroObjectPosition, type ResolvedHeroSurface} from '@/lib/heroSurface'
import {HeroScrim, type HeroScrimStyle, type HeroScrimAlign, type HeroScrimColor, type HeroScrimDirection} from './HeroScrim'

// The treatment follows the resolved surface. A dark surface (photo / dark band) gets
// the scrim + white text. A light surface (a Section Background on a light band) is
// the ghost (monorepo backlog 321; Justin, 2026-10-14, "2: A"): its text is dark, so
// the worst photo pixel is black, and a scrim that held every light tier over it had
// to be 97%. So the photo draws as the Background theme's ghost does, in grey over
// the page ground at the opacity the palette solved (`--fade-opacity-on-light`,
// `fadeOnLight`), with no scrim; the band carries `data-fade="light"`, whose tiers
// are solved over that floor (`validateWcag`), and `data-hero-ghost` here brings a
// transparent header over it onto the same tiers (globals.css). A focal background
// image forces the dark surface, so only the Section Background reaches the ghost.
export function HeroBackdrop({
  surface,
  scrimStyle = 'flat',
  scrimColor = 'auto',
  scrimDirection = 'auto',
  align = 'left',
}: {
  surface: ResolvedHeroSurface
  scrimStyle?: HeroScrimStyle
  // Gradient-only color + direction (passed through to HeroScrim). Default 'auto'.
  scrimColor?: HeroScrimColor
  scrimDirection?: HeroScrimDirection
  align?: HeroScrimAlign
}) {
  if (!surface.hasImage || !surface.bgImage?.src) return null
  const {bgImage, fit, scrimOpacity} = surface
  const image =
    fit === 'tile' ? (
      <div
        className="absolute inset-0 bg-repeat"
        style={{backgroundImage: `url(${bgImage.src})`}}
        role="img"
        aria-label={bgImage.alt ?? ''}
        data-testid="hero-bg-tile"
      />
    ) : (
      <Image
        src={bgImage.src}
        alt={bgImage.alt ?? ''}
        fill
        priority
        className="object-cover"
        style={{objectPosition: heroObjectPosition(bgImage)}}
        sizes="100vw"
      />
    )

  if (!surface.isDark) {
    return (
      <div className="absolute inset-0 z-0 bg-background" data-testid="hero-backdrop" data-hero-ghost="">
        <div className="absolute inset-0 grayscale" style={{opacity: 'var(--fade-opacity-on-light, 0)'}} data-photo-ghost="">
          {image}
        </div>
      </div>
    )
  }
  return (
    <div className="absolute inset-0 z-0" data-testid="hero-backdrop">
      {image}
      <HeroScrim style={scrimStyle} color={scrimColor} direction={scrimDirection} opacity={scrimOpacity} align={align} />
    </div>
  )
}
