import {resolveHeroConfig} from '@/components/layout/homeHero/config'
import type {HomeHeroData} from '@/components/layout/homeHero/types'
import type {VisibleGround} from './sectionSurface'

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
