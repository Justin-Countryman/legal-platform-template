'use client'

// Overlay skeleton — content sits OVER a backdrop. Absorbs Atrium / Summit /
// Overlook / Envoy / Aperture / Plaza via config:
//   • contentAlign  left | center
//   • backdrop      none (scheme) | image | mosaic (gallery)
//   • foreground    cut-out figure on/off
//   • contentStrip  quick-link cards below
//   • motion        content animation (handled by HeroTextBlock)

import Image from 'next/image'
import {HeroForeground} from '@/components/layout/HeroForeground'
import {HeroBackdrop} from '@/components/layout/HeroBackdrop'
import {HeroScrim} from '@/components/layout/HeroScrim'
import {heroForegroundVars, HERO_BAND_MIN_H_LG} from '@/lib/heroLayout'
import {HeroBand, HeroTextBlock} from '../shared'
import {HeroSiloStrip} from '../HeroSiloStrip'
import type {HeroConfig, ResolvedHomeContent, SkeletonProps} from '../types'
import {heroObjectPosition, type ResolvedHeroSurface, type HeroImage} from '@/lib/heroSurface'

// ─── Backdrop (image | mosaic) + scrim ────────────────────────────────────────
// Mosaic tiles are capped at 6 (the 2/3-col grid) and built immutably so we never
// mutate the shared galleryImages array. The legibility scrim (flat | gradient) is
// the shared HeroScrim — always dark here (the backdrop is a focal photo / mosaic).
const MOSAIC_MAX = 6

function Backdrop({config, surface, content}: {config: HeroConfig; surface: ResolvedHeroSurface; content: ResolvedHomeContent}) {
  const mosaicTiles: HeroImage[] = (
    content.galleryImages.length ? content.galleryImages : surface.bgImage ? [surface.bgImage] : []
  ).slice(0, MOSAIC_MAX)

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {config.backdrop === 'mosaic' ? (
        <ul role="list" aria-label="Background image mosaic" className="grid size-full grid-cols-2 md:grid-cols-3">
          {mosaicTiles.map((img, i) => (
            <li key={i} className="relative">
              <Image src={img!.src} alt={img!.alt ?? ''} fill priority={i === 0} className="object-cover" style={{objectPosition: heroObjectPosition(img)}} sizes="(min-width:768px) 34vw, 50vw" />
            </li>
          ))}
        </ul>
      ) : (
        surface.bgImage && (
          <Image src={surface.bgImage.src} alt={surface.bgImage.alt ?? ''} fill priority className="object-cover" style={{objectPosition: heroObjectPosition(surface.bgImage)}} sizes="100vw" />
        )
      )}
      <HeroScrim style={config.scrimStyle} opacity={surface.scrimOpacity} align={config.contentAlign} tone="dark" />
    </div>
  )
}

export function Overlay({config, content, surface, sectionBackground}: SkeletonProps) {
  const fullViewport = config.heightMode === 'fullViewport'
  const centered = config.contentAlign === 'center'
  const hasBackdrop = config.backdrop === 'image' || config.backdrop === 'mosaic'
  // The Section Background only applies when this overlay has no focal backdrop of
  // its own (backdrop = none) — otherwise the backdrop already fills the bleed.
  const sectionNode =
    !hasBackdrop && sectionBackground ? (
      <HeroBackdrop surface={sectionBackground} scrimStyle={config.scrimStyle} align={config.contentAlign} />
    ) : undefined
  const backdropNode = hasBackdrop ? <Backdrop config={config} surface={surface} content={content} /> : sectionNode
  const imageBacked = hasBackdrop || (!!sectionNode && !!sectionBackground?.isDark)
  // Foreground figure pairs with left-aligned text (bottom-right two-column) —
  // not applicable when content is centered.
  const hasFigure = config.foreground && surface.hasForeground && config.contentAlign !== 'center'
  // With a content strip, the text top-aligns so the strip can anchor at the bottom
  // (mt-auto); without it, the content is vertically centered in the band.

  const textBlock = (
    <HeroTextBlock
      eyebrow={content.eyebrow}
      heading={content.heading}
      description={content.description}
      ctas={content.ctas}
      isDark={surface.isDark}
      align={centered ? 'center' : 'start'}
      motion={config.motion}
      className={centered ? 'max-w-2xl' : 'max-w-xl'}
    />
  )

  return (
    <HeroBand
      surface={surface}
      fullViewport={fullViewport}
      backdropNode={backdropNode}
      imageBacked={imageBacked}
      center={!config.contentStrip}
      className={hasFigure ? HERO_BAND_MIN_H_LG : undefined}
    >
      <div
        className={[
          'container relative z-10 flex grow flex-col py-12 md:py-16 lg:py-24',
          centered ? 'items-center justify-center' : 'items-start justify-center',
        ].join(' ')}
        style={hasFigure ? heroForegroundVars() : undefined}
      >
        <div className="w-full" data-hero-heading-reserve={hasFigure ? '' : undefined}>
          {textBlock}
        </div>
        {hasFigure && <HeroForeground surface={surface} />}
      </div>
      <HeroSiloStrip config={config} items={content.practiceAreaItems} />
    </HeroBand>
  )
}
