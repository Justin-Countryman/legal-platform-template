'use client'

// Shared internal-hero background surface: full-bleed image (cover) or tiled
// pattern, with a configurable brand-dark scrim above it. Rendered identically
// by InternalHero and InternalPageHeader so the two never diverge. Sits at z-0
// (below the z-10 content). Renders nothing when the resolved surface has no
// image — the section/header element paints its own solid bg in that case.

import Image from 'next/image'
import {heroObjectPosition, type ResolvedHeroSurface} from '@/lib/heroSurface'
import {HeroScrim, type HeroScrimStyle, type HeroScrimAlign} from './HeroScrim'

// The scrim tone follows the resolved surface: a dark surface (photo / dark band)
// gets the brand-dark scrim + white text; a light surface (subtle pattern) gets the
// page-background scrim + dark text. Internal-hero backdrops are always dark (an
// image forces isDark), so they keep their existing flat brand-dark scrim.
export function HeroBackdrop({
  surface,
  scrimStyle = 'flat',
  align = 'left',
}: {
  surface: ResolvedHeroSurface
  scrimStyle?: HeroScrimStyle
  align?: HeroScrimAlign
}) {
  if (!surface.hasImage || !surface.bgImage?.src) return null
  const {bgImage, fit, scrimOpacity} = surface

  return (
    <div className="absolute inset-0 z-0" data-testid="hero-backdrop">
      {fit === 'tile' ? (
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
      )}
      <HeroScrim style={scrimStyle} opacity={scrimOpacity} align={align} tone={surface.isDark ? 'dark' : 'light'} />
    </div>
  )
}
