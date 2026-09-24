import {describe, expect, it} from 'vitest'
import {heroGround, heroPhotoOf, HERO_PHOTO_MIN_WIDTH} from '../heroGround'
import {photoWindows} from '@/components/sections/sectionFrame'
import type {HomeHeroData} from '@/components/layout/homeHero/types'

// ─── The hero's photograph as a page ground (Phase 17B session 6, `[R-530]`) ───
// `heroPhotoOf` answers the one photograph Photo scrims may lay in windows down the page: the
// backdrop photograph behind an overlay hero, opaque, landscape and wide enough. Everything else
// a hero can hold (a split panel, a mosaic, a section background, a tile, a cutout, a logo, a
// portrait) answers null, and the theme renders its plain fallback. Record §2.1.

const photo = {src: 'https://cdn.example.com/city.jpg', width: 2400, height: 1600, isOpaque: true, assetId: 'image-abc-2400x1600-jpg', hotspot: {x: 0.3, y: 0.4}}
const hero = (over: Partial<HomeHeroData> = {}): HomeHeroData =>
  ({heading: 'Counsel you can call', skeleton: 'overlay', backdrop: 'image', backgroundImage: photo, ...over}) as HomeHeroData

describe('heroPhotoOf', () => {
  it('answers an opaque landscape backdrop photograph behind an overlay, with its asset and hotspot', () => {
    expect(heroPhotoOf(hero())).toEqual({src: photo.src, width: 2400, height: 1600, hotspot: {x: 0.3, y: 0.4}, assetId: photo.assetId})
    // An unset skeleton and backdrop are the overlay and the image, as the hero itself reads them.
    expect(heroPhotoOf(hero({skeleton: null, backdrop: null}))).not.toBeNull()
  })

  it('answers nothing for any other photograph a hero can hold', () => {
    expect(heroPhotoOf(null)).toBeNull()
    expect(heroPhotoOf(hero({skeleton: 'split'}))).toBeNull()                        // the panel, usually the attorneys
    expect(heroPhotoOf(hero({backdrop: 'mosaic'}))).toBeNull()                       // several photographs: backlog 365
    expect(heroPhotoOf(hero({backdrop: 'none', sectionBackgroundImage: photo}))).toBeNull() // usually a texture
    expect(heroPhotoOf(hero({backgroundImage: null}))).toBeNull()
    expect(heroPhotoOf(hero({backgroundImage: {...photo, src: ''}}))).toBeNull()
  })

  it('refuses a tile, a cutout or logo with transparency, a portrait and a photograph too small to slice', () => {
    expect(heroPhotoOf(hero({backgroundImage: {...photo, fit: 'tile'}}))).toBeNull()
    expect(heroPhotoOf(hero({backgroundImage: {...photo, isOpaque: false}}))).toBeNull()
    expect(heroPhotoOf(hero({backgroundImage: {...photo, width: 1600, height: 2400}}))).toBeNull()
    expect(heroPhotoOf(hero({backgroundImage: {...photo, width: 1900, height: 1600}}))).toBeNull()    // under 1.2:1
    expect(heroPhotoOf(hero({backgroundImage: {...photo, width: HERO_PHOTO_MIN_WIDTH - 1, height: 900}}))).toBeNull()
    expect(heroPhotoOf(hero({backgroundImage: {...photo, width: null, height: null}}))).toBeNull()
    // An asset whose opacity was never recorded is not refused for it; the other guards stand.
    expect(heroPhotoOf(hero({backgroundImage: {...photo, isOpaque: null}}))).not.toBeNull()
  })

  it('leaves the hero ground as it was: an image backdrop is still `image` with or without a photograph', () => {
    expect(heroGround(hero())).toBe('image')
    expect(heroGround(hero({backgroundImage: {...photo, isOpaque: false}}))).toBe('image')
  })
})

describe('photoWindows', () => {
  it('with no hotspot, the lower quadrants first, and three of the four', () => {
    expect(photoWindows(null)).toEqual([{x: 0, y: 1}, {x: 1, y: 1}, {x: 0, y: 0}])
  })

  it('never shows the quadrant nearest the hotspot, and gives out the farthest first', () => {
    // A face at the top right: the top-right quadrant is never shown; the bottom left comes first.
    const w = photoWindows({x: 0.8, y: 0.2})
    expect(w).toHaveLength(3)
    expect(w).not.toContainEqual({x: 1, y: 0})
    expect(w[0]).toEqual({x: 0, y: 1})
    // A subject low and left keeps the bottom left out.
    expect(photoWindows({x: 0.2, y: 0.9})).not.toContainEqual({x: 0, y: 1})
  })
})
