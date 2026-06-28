'use client'

// Homepage hero dispatcher. Resolves the layout config → HeroConfig, the NAP
// tokens, and the surface (once), then renders one of the 2 skeleton components
// (code-split via next/dynamic). The skeleton reads `config` to decide its
// internal composition (backdrop type, media type, foreground, motion, …).

import {type ComponentType} from 'react'
import dynamic from 'next/dynamic'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {toCtaItems} from '@/components/ui/ButtonGroup'
import {resolveVariantSurface} from './shared'
import {resolveHeroConfig, imageRoleFor} from './config'
import {type HomeHeroData, type ResolvedHomeContent, type Skeleton, type SkeletonProps} from './types'
import {DEFAULT_SCRIM_OPACITY, type ResolvedHeroSurface} from '@/lib/heroSurface'

const SKELETONS: Record<Skeleton, ComponentType<SkeletonProps>> = {
  overlay: dynamic(() => import('./skeletons/Overlay').then((m) => m.Overlay)),
  split: dynamic(() => import('./skeletons/Split').then((m) => m.Split)),
}

function resolveStr(s: string | null | undefined, tokens?: NapTokens | null) {
  if (!s || !tokens) return s
  return resolveTokenString(s, tokens) || s
}

function resolveCtas(buttons: HomeHeroData['buttons'], tokens?: NapTokens | null) {
  return toCtaItems((buttons ?? []).map((b) => ({...b, title: resolveStr(b.title, tokens) ?? b.title})))
}

export function HomepageHero({data, napTokens}: {data: HomeHeroData; napTokens?: NapTokens | null}) {
  const config = resolveHeroConfig(data)
  const Skeleton = SKELETONS[config.skeleton]

  // Phase 2: the homepage hero is fully DECOUPLED from the internal site defaults
  // — its design (incl. surface) is self-contained in heroSettings.homepageHero,
  // and the migration resolved any previously-inherited surface to concrete values.
  // No useHeroScheme()/useHeroSurfaceDefaults() here; a neutral site default is only
  // the ultimate fallback for an unauthored homepage (which renders placeholder).
  const surface = resolveVariantSurface(
    {scheme: 'dark', bgImage: null, foreground: null, scrimOpacity: DEFAULT_SCRIM_OPACITY},
    {
      schemeOverride: data.schemeOverride,
      backgroundImage: data.backgroundImage,
      backgroundNone: data.backgroundNone,
      foregroundImage: data.foregroundImage,
      foregroundNone: data.foregroundNone,
      scrimOpacityOverride: data.scrimOpacityOverride,
    },
    imageRoleFor(config),
  )

  const galleryImages = (data.galleryImages ?? []).filter((g) => g?.src)

  // A mosaic backdrop sits behind the text even without a single backgroundImage,
  // so force the dark surface treatment in that case.
  const forcedDark = config.backdrop === 'mosaic' && galleryImages.length > 0
  const effectiveSurface = forcedDark ? {...surface, scheme: 'dark' as const, isDark: true} : surface

  // Section Background — the full-bleed pattern/texture behind the whole hero
  // (both layouts). Page-only: present ⇒ on. It adopts the band's resolved scheme
  // (so the Background Scheme control drives its scrim tone) and scrim opacity.
  // Rendered by each skeleton as the z-0 backdrop.
  const sectionImg = data.sectionBackgroundImage?.src ? data.sectionBackgroundImage : null
  const sectionBackground: ResolvedHeroSurface | null = sectionImg
    ? {
        scheme: effectiveSurface.scheme,
        isDark: effectiveSurface.isDark,
        bgImage: sectionImg,
        hasImage: true,
        fit: sectionImg.fit === 'tile' ? 'tile' : 'cover',
        foreground: null,
        hasForeground: false,
        scrimOpacity: effectiveSurface.scrimOpacity,
        scrimStyle: effectiveSurface.scrimStyle,
        sectionBg: null,
        hasSectionBg: false,
        sectionBgFit: 'cover',
      }
    : null

  const content: ResolvedHomeContent = {
    eyebrow: resolveStr(data.eyebrow, napTokens),
    heading: resolveStr(data.heading, napTokens) ?? data.heading,
    description: resolveStr(data.description, napTokens),
    ctas: resolveCtas(data.buttons, napTokens),
    galleryImages,
    videoUrl: data.videoUrl,
    // Require both a label and a destination so a card never renders as a dead "#" link.
    practiceAreaItems: (data.practiceAreaItems ?? []).filter((c) => c?.label && c?.href),
  }

  return <Skeleton config={config} content={content} surface={effectiveSurface} sectionBackground={sectionBackground} />
}
