import {describe, it, expect} from 'vitest'
import {parse, evaluate} from 'groq-js'
import {INTERNAL_HERO_FRAGMENT, INTERNAL_HERO_OVERRIDE_FIELDS} from '../queries'

// Per-page internalHero projection (lib/sanity/queries.ts → INTERNAL_HERO_FRAGMENT).
// Surfaces the cascade-override fields the resolver (lib/heroSurface.ts) consumes:
//   schemeOverride, backgroundNone, foregroundNone, scrimOpacityOverride,
//   backgroundImage (+ fit), foregroundImage.
// groq-js evaluates the fragment against an in-memory dataset, dereferencing
// image assets exactly as the live Sanity query does.

async function fetchHero(hero: Record<string, unknown>, extraDocs: Record<string, unknown>[] = []) {
  const tree = parse(`*[_type == "testPage"][0].hero ${INTERNAL_HERO_FRAGMENT}`)
  const dataset = [{_id: 'p1', _type: 'testPage', hero}, ...extraDocs]
  const result = await evaluate(tree, {dataset})
  return (await result.get()) as Record<string, unknown>
}

describe('INTERNAL_HERO_FRAGMENT — cascade override projection', () => {
  it('projects the scalar override fields verbatim', async () => {
    const out = await fetchHero({
      heading: 'Family Law',
      description: 'Guidance when it matters.',
      schemeOverride: 'light',
      backgroundNone: true,
      foregroundNone: true,
      scrimOpacityOverride: 40,
    })
    expect(out).toMatchObject({
      heading: 'Family Law',
      schemeOverride: 'light',
      backgroundNone: true,
      foregroundNone: true,
      scrimOpacityOverride: 40,
    })
  })

  it('returns null for override fields when unset (resolver applies inherit/defaults)', async () => {
    const out = await fetchHero({heading: 'Bare'})
    expect(out.schemeOverride).toBeNull()
    expect(out.backgroundNone).toBeNull()
    expect(out.foregroundNone).toBeNull()
    expect(out.scrimOpacityOverride).toBeNull()
    expect(out.backgroundImage).toBeNull()
    expect(out.foregroundImage).toBeNull()
  })

  it('derefs a custom backgroundImage to {src, alt, fit, width, height}', async () => {
    const out = await fetchHero(
      {
        heading: 'Custom bg',
        backgroundImage: {
          _type: 'image',
          alt: 'Office',
          fit: 'cover',
          asset: {_type: 'reference', _ref: 'image-bg'},
        },
      },
      [{_id: 'image-bg', _type: 'sanity.imageAsset', url: 'https://cdn/bg.jpg', metadata: {dimensions: {width: 1600, height: 900}}}],
    )
    expect(out.backgroundImage).toEqual({
      src: 'https://cdn/bg.jpg',
      alt: 'Office',
      fit: 'cover',
      width: 1600,
      height: 900,
    })
  })

  it('derefs a foregroundImage to {src, alt, width, height} (no fit)', async () => {
    const out = await fetchHero(
      {
        heading: 'Foreground',
        foregroundImage: {
          _type: 'image',
          alt: 'Attorney portrait',
          asset: {_type: 'reference', _ref: 'image-fg'},
        },
      },
      [{_id: 'image-fg', _type: 'sanity.imageAsset', url: 'https://cdn/fg.png', metadata: {dimensions: {width: 800, height: 1200}}}],
    )
    expect(out.foregroundImage).toEqual({
      src: 'https://cdn/fg.png',
      alt: 'Attorney portrait',
      hotspot: null, // no hotspot set → projected null
      width: 800,
      height: 1200,
    })
  })

  it('projects the foregroundImage hotspot {x, y} when set (for face-safe cover cropping)', async () => {
    const out = await fetchHero(
      {
        heading: 'Foreground w/ hotspot',
        foregroundImage: {
          _type: 'image',
          alt: 'Attorney',
          hotspot: {_type: 'sanity.imageHotspot', x: 0.42, y: 0.18, height: 0.5, width: 0.5},
          asset: {_type: 'reference', _ref: 'image-fg2'},
        },
      },
      [{_id: 'image-fg2', _type: 'sanity.imageAsset', url: 'https://cdn/fg2.png', metadata: {dimensions: {width: 800, height: 1200}}}],
    )
    expect((out.foregroundImage as Record<string, unknown>).hotspot).toEqual({x: 0.42, y: 0.18})
  })
})

// Page-type queries that need a heading fallback splice INTERNAL_HERO_OVERRIDE_FIELDS
// after a coalesced heading (attorneyIndex, staffIndex, serviceArea, blogIndex,
// geoPracticeArea, locationPage, etc.). This is the projection shape that the
// per-page scrim/scheme/foreground overrides were silently dropped from before
// the shared-fields fix — lock it so every page type surfaces them.
describe('INTERNAL_HERO_OVERRIDE_FIELDS — spliced after a coalesced heading', () => {
  async function fetchInlineHero(hero: Record<string, unknown>) {
    const tree = parse(
      `*[_type == "testPage"][0]{"hero": hero{"heading": coalesce(heading, "Fallback"), ${INTERNAL_HERO_OVERRIDE_FIELDS}}}.hero`,
    )
    const result = await evaluate(tree, {dataset: [{_id: 'p1', _type: 'testPage', hero}]})
    return (await result.get()) as Record<string, unknown>
  }

  it('surfaces scrimOpacityOverride + scheme/none overrides on a coalesced-heading page', async () => {
    const out = await fetchInlineHero({
      schemeOverride: 'light',
      backgroundNone: true,
      foregroundNone: false,
      scrimOpacityOverride: 35,
    })
    expect(out).toMatchObject({
      heading: 'Fallback',
      schemeOverride: 'light',
      backgroundNone: true,
      foregroundNone: false,
      scrimOpacityOverride: 35,
    })
  })

  it('falls back to the page-type heading when hero.heading is unset', async () => {
    const out = await fetchInlineHero({scrimOpacityOverride: 50})
    expect(out.heading).toBe('Fallback')
    expect(out.scrimOpacityOverride).toBe(50)
  })
})
