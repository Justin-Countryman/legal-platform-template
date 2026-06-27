'use client'

// Split skeleton — text beside media. Absorbs Vista / Reel / Inlay via config:
//   • splitMedia      image | video
//   • splitImageStyle contained (ratio panel) | full (edge-to-edge) | overlap (3-image collage) — image only
//   • splitImageRatio aspect ratio of the contained panel / video poster
//   • textTreatment   inline (plain column) | overlap (raised "Inlay" card)
//   • mediaSide       left | right (which column the media occupies on lg)
//   • motion          content animation (handled by HeroTextBlock)
// Text sits on the scheme background (panel image role) — never pass a backdrop.

import Image from 'next/image'
import {MdPlayArrow} from 'react-icons/md'
import {DialogPanel} from '@/components/ui/DialogPanel'
import {HeroBackdrop} from '@/components/layout/HeroBackdrop'
import {getEmbedUrl} from '@/lib/videoEmbed'
import {HeroBand, HeroTextBlock, HERO_HEADER_CLEARANCE} from '../shared'
import {HeroSiloStrip} from '../HeroSiloStrip'
import type {HeroConfig, ResolvedHomeContent, SkeletonProps, SplitImageRatio} from '../types'
import {heroObjectPosition, type ResolvedHeroSurface, type HeroImage} from '@/lib/heroSurface'

const MEDIA_SIZES = '(min-width:1024px) 45vw, 100vw'

// Contained-panel aspect ratio classes (the 'auto' ratio renders NaturalImage
// instead — the image's intrinsic ratio, no crop).
const PANEL_BASE = 'relative w-full overflow-hidden rounded-ui shadow-elevation-md'
const RATIO_ASPECT: Record<Exclude<SplitImageRatio, 'auto'>, string> = {
  anamorphic: 'aspect-[2.39/1]',
  univisium: 'aspect-[2/1]',
  widescreen: 'aspect-video',
  landscape: 'aspect-[3/2]',
  square: 'aspect-square',
  portrait: 'aspect-[2/3]',
}

// ─── Image media (Vista) — single panel image at the chosen ratio ─────────────
function StaticImage({img, aspect}: {img: NonNullable<HeroImage>; aspect: string}) {
  return (
    <div className={`${PANEL_BASE} ${aspect}`}>
      <Image src={img.src} alt={img.alt ?? ''} fill priority sizes={MEDIA_SIZES} className="object-cover" style={{objectPosition: heroObjectPosition(img)}} />
    </div>
  )
}

// Natural ('auto' ratio): keeps the image's intrinsic aspect ratio (no crop).
function NaturalImage({img}: {img: NonNullable<HeroImage>}) {
  return (
    <div className="overflow-hidden rounded-ui shadow-elevation-md">
      <Image
        src={img.src}
        alt={img.alt ?? ''}
        width={img.width ?? 1200}
        height={img.height ?? 900}
        priority
        sizes={MEDIA_SIZES}
        className="h-auto w-full object-cover"
      />
    </div>
  )
}

function ImageMedia({config, surface}: {config: HeroConfig; surface: ResolvedHeroSurface}) {
  const img = surface.bgImage
  if (!img?.src) return null
  if (config.splitImageRatio === 'auto') return <NaturalImage img={img} />
  return <StaticImage img={img} aspect={RATIO_ASPECT[config.splitImageRatio]} />
}

// ─── Overlap collage — layered 3-image cluster (portrait center, landscape
// bottom-left, square top-right). Uses galleryImages (falls back to the single
// background image for the centerpiece). ─────────────────────────────────────
function CollageTile({img, className, sizes, priority}: {img: NonNullable<HeroImage>; className: string; sizes: string; priority?: boolean}) {
  return (
    <div className={['relative overflow-hidden rounded-ui shadow-elevation-md', className].join(' ')}>
      <Image src={img.src} alt={img.alt ?? ''} fill priority={priority} sizes={sizes} className="object-cover" style={{objectPosition: heroObjectPosition(img)}} />
    </div>
  )
}

function OverlapCollage({surface, content}: {surface: ResolvedHeroSurface; content: ResolvedHomeContent}) {
  const imgs = content.galleryImages.filter((g) => g?.src)
  const center = imgs[0] ?? surface.bgImage
  const second = imgs[1]
  const third = imgs[2]
  if (!center?.src) return null
  return (
    <div className="relative flex w-full py-8 lg:py-0">
      {second?.src && (
        <div className="absolute bottom-[10%] left-0 z-10 w-[45%]">
          <CollageTile img={second} className="aspect-[3/2]" sizes="(min-width:1024px) 22vw, 45vw" />
        </div>
      )}
      <div className="mx-[15%] w-full">
        <CollageTile img={center} priority className="aspect-[2/3]" sizes="(min-width:1024px) 30vw, 70vw" />
      </div>
      {third?.src && (
        <div className="absolute right-0 top-[10%] z-10 w-[40%]">
          <CollageTile img={third} className="aspect-square" sizes="(min-width:1024px) 20vw, 40vw" />
        </div>
      )}
    </div>
  )
}

// ─── Video media (Reel) — poster + play affordance opening an embed dialog ─────
// The poster follows the Ratio control (defaults to 16:9 to match the video).
function VideoMedia({content, surface, aspect}: {content: ResolvedHomeContent; surface: ResolvedHeroSurface; aspect: string}) {
  const img = surface.bgImage
  const embedUrl = content.videoUrl ? getEmbedUrl(content.videoUrl) : null

  if (!img?.src) return null

  const poster = (
    <Image
      src={img.src}
      alt={img.alt ?? ''}
      fill
      priority
      sizes={MEDIA_SIZES}
      className="object-cover"
      style={{objectPosition: heroObjectPosition(img)}}
    />
  )

  // No playable URL → static poster alone.
  if (!embedUrl) {
    return <div className={`${PANEL_BASE} ${aspect}`}>{poster}</div>
  }

  const trigger = (
    <button
      type="button"
      aria-label="Play video"
      className={`group ${PANEL_BASE} ${aspect}`}
    >
      {poster}
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-16 place-items-center rounded-full bg-brand-dark/30 backdrop-blur-sm transition-transform duration-structural-fast group-hover:scale-110">
          <MdPlayArrow className="size-9 text-brand-light" aria-hidden="true" />
        </span>
      </span>
    </button>
  )

  return (
    <DialogPanel trigger={trigger} title={content.heading || 'Video'} size="xl">
      <iframe
        src={embedUrl}
        className="aspect-video w-full rounded-ui"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        title="Video"
      />
    </DialogPanel>
  )
}

export function Split({config, content, surface, sectionBackground}: SkeletonProps) {
  const fullViewport = config.heightMode === 'fullViewport'
  const mediaLeft = config.mediaSide === 'left'
  const isOverlap = config.textTreatment === 'overlap'

  // Optional full-bleed Section Background (pattern/texture + scrim) behind both
  // columns. Rendered as the band's z-0 backdrop; the content/media wrappers below
  // carry `relative z-10` so they sit above it.
  const sectionNode = sectionBackground ? (
    <HeroBackdrop surface={sectionBackground} scrimStyle={config.scrimStyle} align={config.contentAlign} />
  ) : undefined
  const imageBacked = !!sectionNode && !!sectionBackground?.isDark

  // ─── Media column by type ───────────────────────────────────────────────────
  let media: React.ReactNode = null
  switch (config.splitMedia) {
    case 'image':
      media =
        config.splitImageStyle === 'overlap' ? (
          <OverlapCollage surface={surface} content={content} />
        ) : (
          <ImageMedia config={config} surface={surface} />
        )
      break
    case 'video': {
      // Poster follows the Ratio control; 'auto' maps to 16:9 (matches the video).
      const vAspect = config.splitImageRatio === 'auto' ? 'aspect-video' : RATIO_ASPECT[config.splitImageRatio]
      media = <VideoMedia content={content} surface={surface} aspect={vAspect} />
      break
    }
  }

  // ─── Text column ──────────────────────────────────────────────────────────
  // Inline: plain text block on the scheme background. Card (Inlay): a light
  // raised island that overlaps the media's inner edge, so its CTAs use the
  // light context regardless of the section scheme.
  // Inline text honors content alignment; the card treatment stays left-aligned
  // (a centered overlapping card reads oddly).
  const textBlock = (
    <HeroTextBlock
      eyebrow={content.eyebrow}
      heading={content.heading}
      description={content.description}
      ctas={content.ctas}
      isDark={isOverlap ? false : surface.isDark}
      align={!isOverlap && config.contentAlign === 'center' ? 'center' : 'start'}
      motion={config.motion}
      className={isOverlap ? undefined : 'max-w-xl py-12 md:py-16 lg:py-24'}
    />
  )

  // ─── Card (Inlay) — overlapping composition ─────────────────────────────────
  // A wide image with a raised card overlapping its inner edge. Uses a 12-col
  // grid where the image and card share rows with overlapping column spans, so
  // they genuinely overlap (not a 50/50 split with a gap). The card has a border
  // + elevation so it reads as a distinct panel even on a light scheme.
  if (isOverlap) {
    // Landscape image on one side; a self-sized card vertically centered and
    // overlapping its inner edge. The card is in normal flow on mobile (pulled up
    // to overlap the image top) and absolutely positioned on lg (so it never
    // stretches/clips and always overlaps).
    const cardImg = config.splitMedia === 'image' && surface.bgImage?.src ? surface.bgImage : null
    const imageEl = cardImg ? (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-ui shadow-elevation-md lg:aspect-[3/2]">
        <Image src={cardImg.src} alt={cardImg.alt ?? ''} fill priority sizes="(min-width:1024px) 60vw, 100vw" className="object-cover" style={{objectPosition: heroObjectPosition(cardImg)}} />
      </div>
    ) : (
      media
    )

    return (
      <HeroBand surface={surface} fullViewport={fullViewport} center backdropNode={sectionNode} imageBacked={imageBacked}>
        <div className="container relative z-10">
          <div className="relative py-6 lg:py-12">
            {/* Image 60% on one side; card 48% on the other → a guaranteed ~8% overlap
                at every width (percentage widths, no max-width cap that would re-open a gap). */}
            <div className={['lg:w-[60%]', mediaLeft ? '' : 'lg:ml-auto'].join(' ')}>{imageEl}</div>
            <div
              // The card is always a light (bg-background) island. Reset the scheme
              // cascade to light so the heading/lede (text-foreground) read dark even
              // when the band is dark — otherwise they inherit the band's light text.
              data-ring-context="light"
              className={[
                'relative z-10 mx-auto -mt-16 w-[88%] rounded-ui border border-border bg-background p-8 shadow-elevation-lg',
                'sm:-mt-20 sm:w-[78%]',
                'lg:absolute lg:top-1/2 lg:mx-0 lg:mt-0 lg:w-[48%] lg:-translate-y-1/2 lg:p-10',
                mediaLeft ? 'lg:right-0' : 'lg:left-0',
              ].join(' ')}
            >
              {textBlock}
            </div>
          </div>
        </div>
        <HeroSiloStrip config={config} items={content.practiceAreaItems} />
      </HeroBand>
    )
  }

  // ─── Full-bleed image side ──────────────────────────────────────────────────
  // The image fills its entire half edge-to-edge (no gutter, no rounding), full
  // band height. The text column owns its own padding (band is flush). Image only
  // (other media types fall through to the contained layout).
  if (config.splitImageStyle === 'full' && config.splitMedia === 'image' && surface.bgImage?.src) {
    const im = surface.bgImage
    const fullAlign = config.contentAlign === 'center' ? 'center' : 'start'
    return (
      <HeroBand surface={surface} fullViewport={fullViewport} flush backdropNode={sectionNode} imageBacked={imageBacked}>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 lg:items-stretch">
          {/* Text column owns the header clearance + vertical padding (the band is flush). */}
          <div
            className={['flex items-center px-[5%] pb-12 md:pb-16 lg:pb-20', mediaLeft ? 'lg:order-2' : ''].join(' ')}
            style={{paddingTop: HERO_HEADER_CLEARANCE}}
          >
            <HeroTextBlock
              eyebrow={content.eyebrow}
              heading={content.heading}
              description={content.description}
              ctas={content.ctas}
              isDark={surface.isDark}
              align={fullAlign}
              motion={config.motion}
              className="w-full max-w-xl"
            />
          </div>
          {/* Image fills its half to all edges — no padding above/below. */}
          <div className={['relative min-h-[20rem] lg:min-h-0', mediaLeft ? 'lg:order-1' : ''].join(' ')}>
            <Image src={im.src} alt={im.alt ?? ''} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" style={{objectPosition: heroObjectPosition(im)}} />
          </div>
        </div>
        <HeroSiloStrip config={config} items={content.practiceAreaItems} />
      </HeroBand>
    )
  }

  // ─── Inline — standard side-by-side split (contained panel) ─────────────────
  return (
    <HeroBand surface={surface} fullViewport={fullViewport} center backdropNode={sectionNode} imageBacked={imageBacked}>
      <div className="container relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={mediaLeft ? 'lg:order-2' : ''}>{textBlock}</div>
        <div className={mediaLeft ? 'lg:order-1' : ''}>{media}</div>
      </div>
      <HeroSiloStrip config={config} items={content.practiceAreaItems} />
    </HeroBand>
  )
}
