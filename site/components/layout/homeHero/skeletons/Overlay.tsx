'use client'

// Overlay skeleton — content sits OVER a backdrop. Absorbs Atrium / Summit /
// Overlook / Envoy / Aperture / Plaza via config:
//   • contentAlign  left | center
//   • backdrop      none (scheme) | image | mosaic (gallery)
//   • foreground    cut-out figure on/off
//   • motion        content animation (handled by HeroTextBlock)

import Image from 'next/image'
import {HeroForeground} from '@/components/layout/HeroForeground'
import {HeroBackdrop} from '@/components/layout/HeroBackdrop'
import {HeroScrim} from '@/components/layout/HeroScrim'
import {heroForegroundVars, HERO_BAND_MIN_H_LG} from '@/lib/heroLayout'
import {HeroBand, HeroTextBlock, heroHeadingText, heroPhotoMark} from '../shared'
import type {HeroConfig, ResolvedHomeContent, SkeletonProps} from '../types'
import {HERO_BACKDROP_SIZES, heroObjectPosition, type ResolvedHeroSurface, type HeroImage} from '@/lib/heroSurface'

// ─── Backdrop (image | mosaic) + scrim ────────────────────────────────────────
// Mosaic tiles are capped at 6 (the 2/3-col grid) and built immutably so we never
// mutate the shared galleryImages array. The legibility scrim (flat | gradient) is
// the shared HeroScrim — always dark here (the backdrop is a focal photo / mosaic).
const MOSAIC_MAX = 6

// The site's photo color (monorepo backlog 438): marked, each mosaic tile and the photograph's own box carry the treatment,
// under the scrim, which stays the backdrop's last layer; the photograph's box drifts with it, so the tint never parts from
// the picture. Unmarked, the markup is as before.
function Backdrop({config, surface, content, treated}: {config: HeroConfig; surface: ResolvedHeroSurface; content: ResolvedHomeContent; treated?: boolean}) {
  const mosaicTiles: HeroImage[] = (
    content.galleryImages.length ? content.galleryImages : surface.bgImage ? [surface.bgImage] : []
  ).slice(0, MOSAIC_MAX)

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {config.backdrop === 'mosaic' ? (
        <ul role="list" aria-label="Background image mosaic" className="grid size-full grid-cols-2 md:grid-cols-3">
          {mosaicTiles.map((img, i) => (
            <li key={i} className="relative" {...heroPhotoMark(treated)}>
              <Image src={img!.src} alt={img!.alt ?? ''} fill priority={i === 0} className="object-cover" style={{objectPosition: heroObjectPosition(img)}} sizes="(min-width:768px) 34vw, 50vw" />
            </li>
          ))}
        </ul>
      ) : (
        // `hero-drift`: the photograph drifts as the hero leaves (globals.css, the parallax); only a
        // single full-bleed photograph, never the mosaic, whose tiles do not clip.
        surface.bgImage && (treated ? (
          <div className="absolute inset-0 hero-drift" {...heroPhotoMark(treated)}>
            <Image src={surface.bgImage.src} alt={surface.bgImage.alt ?? ''} fill priority className="object-cover" style={{objectPosition: heroObjectPosition(surface.bgImage)}} sizes={HERO_BACKDROP_SIZES} />
          </div>
        ) : (
          <Image src={surface.bgImage.src} alt={surface.bgImage.alt ?? ''} fill priority className="object-cover hero-drift" style={{objectPosition: heroObjectPosition(surface.bgImage)}} sizes={HERO_BACKDROP_SIZES} />
        ))
      )}
      <HeroScrim style={config.scrimStyle} color={config.scrimColor} direction={config.scrimDirection} opacity={surface.scrimOpacity} align={config.contentAlign} tone="dark" textRight={config.foreground && config.foregroundSide === 'left' && config.contentAlign !== 'center'} />
    </div>
  )
}

export function Overlay({config, content, surface, sectionBackground, edgeBelow, glow, texture, photoTreated}: SkeletonProps) {
  const fullViewport = config.heightMode === 'fullViewport'
  const centered = config.contentAlign === 'center'
  const hasBackdrop = config.backdrop === 'image' || config.backdrop === 'mosaic'
  // The Section Background only applies when this overlay has no focal backdrop of
  // its own (backdrop = none) — otherwise the backdrop already fills the bleed.
  const sectionNode =
    !hasBackdrop && sectionBackground ? (
      <HeroBackdrop surface={sectionBackground} scrimStyle={config.scrimStyle} scrimColor={config.scrimColor} scrimDirection={config.scrimDirection} align={config.contentAlign} />
    ) : undefined
  const backdropNode = hasBackdrop ? <Backdrop config={config} surface={surface} content={content} treated={photoTreated} /> : sectionNode
  const imageBacked = hasBackdrop || (!!sectionNode && !!sectionBackground?.isDark)
  // Foreground figure pairs with left-aligned text (bottom-right two-column) —
  // not applicable when content is centered.
  const hasFigure = config.foreground && surface.hasForeground && config.contentAlign !== 'center'
  // The figure on the left moves the text column right (`foregroundSide`, monorepo `[R-641]`).
  const figureLeft = hasFigure && config.foregroundSide === 'left'

  const textBlock = (
    <HeroTextBlock
      eyebrow={content.eyebrow}
      heading={heroHeadingText(content)}
      description={content.description}
      ctas={content.ctas}
      isDark={surface.isDark}
      align={centered ? 'center' : 'start'}
      motion={config.motion}
      className={centered ? 'max-w-2xl' : 'max-w-xl'}
    />
  )

  return (
    <HeroBand edgeBelow={edgeBelow} glow={glow} texture={texture}
      surface={surface}
      fullViewport={fullViewport}
      backdropNode={backdropNode}
      imageBacked={imageBacked}
      center
      className={hasFigure ? HERO_BAND_MIN_H_LG : undefined}
    >
      <div
        className={[
          'container relative z-10 flex grow flex-col py-12 md:py-16 lg:py-24',
          centered ? 'items-center justify-center' : 'items-start justify-center',
        ].join(' ')}
        style={hasFigure ? heroForegroundVars() : undefined}
      >
        <div className="w-full" data-hero-heading-reserve={hasFigure ? (figureLeft ? 'left' : '') : undefined}>
          {textBlock}
        </div>
        {hasFigure && <HeroForeground surface={surface} grounded side={figureLeft ? 'left' : 'right'} />}
      </div>
    </HeroBand>
  )
}
