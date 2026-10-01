import {resolveHeroConfig} from '@/components/layout/homeHero/config'
import type {HomeHeroData} from '@/components/layout/homeHero/types'
import type {VisibleGround} from './sectionSurface'
import type {HeroImage} from './heroSurface'
import type {FlowRules} from './flows'

// ─── The hero's bottom ground (Phase 16C) ─────────────────────────────────────
// What the first section meets at the hero's bottom, answered on the server from the
// stored hero alone. Any photo there (an image backdrop, even one with no photo yet,
// which shows a scrim over the page; a mosaic; a section background; a split whose
// image reaches the bottom) is `image`; otherwise the hero's scheme: the tint step on a
// light hero, the dark ground on a dark one. The first section rises into the hero in
// its own ground, so the hero's own color never has to be known exactly (ADV-P16C-A).
export function heroGround(hero: HomeHeroData | null, flow: Pick<FlowRules, 'light'> | null = null): VisibleGround {
  if (!hero) return 'light'
  const c = resolveHeroConfig(hero)
  if (c.skeleton === 'overlay' && (c.backdrop === 'image' || c.backdrop === 'mosaic')) return 'image'
  if (hero.sectionBackgroundImage?.src) return 'image'
  if (c.skeleton === 'split' && c.splitImageStyle === 'full' && c.splitMedia === 'image') return 'image'
  if (hero.schemeOverride !== 'light') return 'dark'
  return heroPaint(hero, flow) === 'wash' ? 'wash' : 'tint'
}

// ─── The light hero's paint (Phase 18 session B, `[R-603]`) ────────────────────
// Justin, of Soft wash on a throwaway: "I would expect the hero to be the warm color bg and not the grey". A light hero
// painted the tint, the ground at L -0.015 (ΔE2000 1.0 from the page on every preset), which on a white page reads as a
// grey step. Under a theme that paints washes it paints the wash: wherever the band's own ground shows, which is every
// light hero but one with a photograph, a mosaic or a section background behind it (the text half of a full-bleed split
// included, whose band paints behind that half). `heroGround` stays what the first band meets.
export function heroPaint(hero: HomeHeroData | null, flow: Pick<FlowRules, 'light'> | null | undefined): 'wash' | null {
  if (!hero || flow?.light.paint !== 'washes' || hero.schemeOverride !== 'light') return null
  const c = resolveHeroConfig(hero)
  if (c.skeleton === 'overlay' && (c.backdrop === 'image' || c.backdrop === 'mosaic')) return null
  if (hero.sectionBackgroundImage?.src) return null
  return 'wash'
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

// ─── The theme's set of photographs (Phase 17E, `[R-573]`, `[R-574]`) ─────────────
// Photographs of one place an operator uploads once in Design Settings (`themePhotos`), which Photo
// scrims lays behind the closing call to action and behind runs of sections, beside the hero's own
// photograph. Each is read against the same guard as the hero's (opaque, landscape at least 1.2 to 1
// once cropped, at least 1,600 pixels wide once cropped), drawn once however often it was added, never
// when it is the hero's own photograph (the hero again, 17B6-A), and only while its key is among the
// approved (`flowPhotos`): nothing in an image's data tells a place from a person, so a photograph added
// or replaced after Apply shows nowhere until the operator approves it in the preview.
//
// THE KEY IS THE PHOTOGRAPH AND THE PIXELS DRAWN (the pre-PR break pass, record §9): the asset id, and
// where the operator cropped it, the rectangle the image CDN cuts (`rect=left,top,width,height`, as
// `@sanity/image-url` computes it from the crop and the asset's size). So a crop widened in the Studio
// after Apply waits for approval like a new photograph, while setting the focal point (the Studio writes
// a zero crop beside it) or a crop moved by less than a pixel changes nothing. Every pixel a set
// photograph can draw on any screen lies inside that rectangle.
export type SetPhoto = {
  /** The image as the URL builder reads it: the asset reference, the crop and the focal point. */
  image: {asset: {_ref: string}; crop?: {top: number; bottom: number; left: number; right: number} | null; hotspot?: {x: number; y: number; width?: number; height?: number} | null}
  assetId: string
  /** What an approval names: the asset id, and the crop's rectangle where it crops anything. */
  key: string
  /** The size once cropped. */
  width: number
  height: number
}
export type SetPhotoStatus = 'approved' | 'notApproved' | 'small' | 'portrait' | 'transparent' | 'duplicate' | 'hero'
export type SetPhotoEntry = {photo: SetPhoto; status: SetPhotoStatus}

/** The asset's size, from its id (`image-<hash>-<width>x<height>-<format>`). */
function refSize(ref: string): {width: number; height: number} | null {
  const m = /-(\d+)x(\d+)-[a-z0-9]+$/.exec(ref)
  return m ? {width: Number(m[1]), height: Number(m[2])} : null
}

/** The approval key of a photograph of the set: its asset id, then `#left,top,width,height` in the asset's
 *  pixels where the crop cuts anything, the rectangle the image CDN cuts. */
export function setPhotoKey(image: SetPhoto['image']): string {
  const ref = image.asset._ref
  const size = refSize(ref)
  const c = image.crop
  if (!size || !c) return ref
  const left = Math.round((c.left ?? 0) * size.width)
  const top = Math.round((c.top ?? 0) * size.height)
  const width = Math.round(size.width - (c.right ?? 0) * size.width - left)
  const height = Math.round(size.height - (c.bottom ?? 0) * size.height - top)
  return left === 0 && top === 0 && width === size.width && height === size.height ? ref : `${ref}#${left},${top},${width},${height}`
}

type RawSetPhoto = {asset?: {_ref?: unknown} | null; crop?: SetPhoto['image']['crop']; hotspot?: SetPhoto['image']['hotspot']; width?: unknown; height?: unknown; isOpaque?: unknown; assetId?: unknown}

/** Every photograph of the stored set, in order, with why it draws or does not. */
export function setPhotoEntries(tokens: Record<string, unknown> | null | undefined, heroAssetId: string | null | undefined): SetPhotoEntry[] {
  const list = Array.isArray(tokens?.themePhotos) ? (tokens!.themePhotos as RawSetPhoto[]) : []
  const approved = new Set(Array.isArray(tokens?.flowPhotos) ? (tokens!.flowPhotos as unknown[]).filter((x): x is string => typeof x === 'string') : [])
  const seen = new Set<string>()
  const out: SetPhotoEntry[] = []
  for (const raw of list) {
    const ref = typeof raw?.asset?._ref === 'string' ? raw.asset._ref : null
    if (!ref) continue
    const crop = raw.crop ?? null
    const keepW = crop ? Math.max(0, 1 - (crop.left ?? 0) - (crop.right ?? 0)) : 1
    const keepH = crop ? Math.max(0, 1 - (crop.top ?? 0) - (crop.bottom ?? 0)) : 1
    const width = Math.round(Number(raw.width ?? 0) * keepW)
    const height = Math.round(Number(raw.height ?? 0) * keepH)
    const image: SetPhoto['image'] = {asset: {_ref: ref}, crop, hotspot: raw.hotspot ?? null}
    const key = setPhotoKey(image)
    const photo: SetPhoto = {image, assetId: ref, key, width, height}
    const status: SetPhotoStatus =
      seen.has(ref) ? 'duplicate'
        : ref === heroAssetId ? 'hero'
          : raw.isOpaque === false ? 'transparent'
            : width < HERO_PHOTO_MIN_WIDTH ? 'small'
              : height <= 0 || width < HERO_PHOTO_MIN_ASPECT * height ? 'portrait'
                : approved.has(key) ? 'approved' : 'notApproved'
    seen.add(ref)
    out.push({photo, status})
  }
  return out
}

/** The photographs the theme may draw, in order: approved, qualifying, each once, never the hero's. */
export function photoSetOf(tokens: Record<string, unknown> | null | undefined, heroAssetId: string | null | undefined): SetPhoto[] {
  return setPhotoEntries(tokens, heroAssetId).filter((e) => e.status === 'approved').map((e) => e.photo)
}

/** The keys the preview approves with a theme that draws photographs: every photograph of the stored set
 *  the theme may draw (never one refused: under 1,600 pixels, portrait, transparent, a duplicate or the
 *  hero's own, so a refusal lifted later still waits for the preview), sorted, so a reorder needs no new
 *  approval; or none. The stored set is read with each asset's size and opacity (`PREVIEW_STORED_DESIGN_QUERY`). */
export function setApprovalKeys(doc: Record<string, unknown> | null | undefined, heroAssetId: string | null | undefined): string[] {
  const usable = setPhotoEntries({themePhotos: doc?.themePhotos}, heroAssetId).filter((e) => e.status === 'approved' || e.status === 'notApproved')
  return [...new Set(usable.map((e) => e.photo.key))].sort()
}
