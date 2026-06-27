'use client'

// Shared internal-hero background surface: full-bleed image (cover) or tiled
// pattern, with a configurable brand-dark scrim above it. Rendered identically
// by InternalHero and InternalPageHeader so the two never diverge. Sits at z-0
// (below the z-10 content). Renders nothing when the resolved surface has no
// image — the section/header element paints its own solid bg in that case.

import Image from 'next/image'
import {heroObjectPosition, type ResolvedHeroSurface} from '@/lib/heroSurface'

export function HeroBackdrop({surface}: {surface: ResolvedHeroSurface}) {
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
      {/* Configurable scrim — opacity from the cascade resolver (was hardcoded /80). */}
      <div
        className="absolute inset-0 bg-brand-dark"
        style={{opacity: scrimOpacity / 100}}
        data-testid="hero-scrim"
      />
    </div>
  )
}
