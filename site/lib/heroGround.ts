import {resolveHeroConfig} from '@/components/layout/homeHero/config'
import type {HomeHeroData} from '@/components/layout/homeHero/types'
import type {VisibleGround} from './sectionSurface'
import type {HeroImage} from './heroSurface'

// ─── The hero's bottom ground (Phase 16C) ─────────────────────────────────────
// What the first section meets at the hero's bottom, answered on the server from the
// stored hero alone. Any photo there (an image backdrop, even one with no photo yet,
// which shows a scrim over the page; a mosaic; a section background; a split whose
// image reaches the bottom) is `image`; otherwise the hero's scheme: the tint step on a
// light hero, the dark ground on a dark one. The first section rises into the hero in
// its own ground, so the hero's own color never has to be known exactly (ADV-P16C-A).
export function heroGround(hero: HomeHeroData | null): VisibleGround {
  if (!hero) return 'light'
  const c = resolveHeroConfig(hero)
  if (c.skeleton === 'overlay' && (c.backdrop === 'image' || c.backdrop === 'mosaic')) return 'image'
  if (hero.sectionBackgroundImage?.src) return 'image'
  if (c.skeleton === 'split' && c.splitImageStyle === 'full' && c.splitMedia === 'image') return 'image'
  return hero.schemeOverride === 'light' ? 'tint' : 'dark'
}

// ─── The hero's photograph as a page ground (Phase 17B session 6, `[R-530]`) ───
// The photograph the Photo scrims theme lays in windows down the page: the hero's backdrop
// photograph behind an overlay, and nothing else. Not the split's panel (usually the
// attorneys), not the mosaic (several photographs: backlog 365's), not the section background
// (usually a texture), never the foreground cutout. A photograph a page can be made of is
// opaque (a cutout or a logo with transparency is not), landscape (at least 1.2 times as wide
// as tall) and at least 1,600 pixels wide, so a quarter of it at twice the hero's scale is not
// a smear. What no guard can see is a photograph of a person: the operator sees it in the
// preview, and the theme draws only the photograph it was approved with (`[R-532]`).
export type HeroPhoto = {src: string; width: number; height: number; hotspot: {x: number; y: number} | null; assetId: string | null}

export const HERO_PHOTO_MIN_WIDTH = 1600
export const HERO_PHOTO_MIN_ASPECT = 1.2

export function heroPhotoOf(hero: HomeHeroData | null): HeroPhoto | null {
  if (!hero) return null
  const c = resolveHeroConfig(hero)
  if (c.skeleton !== 'overlay' || c.backdrop !== 'image') return null
  const img: HeroImage = hero.backgroundImage ?? null
  if (!img?.src || img.fit === 'tile' || img.isOpaque === false) return null
  const w = img.width ?? 0
  const h = img.height ?? 0
  if (w < HERO_PHOTO_MIN_WIDTH || h <= 0 || w < HERO_PHOTO_MIN_ASPECT * h) return null
  return {src: img.src, width: w, height: h, hotspot: img.hotspot ?? null, assetId: img.assetId ?? null}
}
