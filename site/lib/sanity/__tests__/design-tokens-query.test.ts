import {describe, it, expect} from 'vitest'
import {parse, evaluate} from 'groq-js'
import {DESIGN_TOKENS_QUERY} from '../queries'

// WS-Sidebar Phase 2.1 — GROQ projection for the three new sidebar
// designSettings fields (sidebarNavIconStyle, sidebarWidgetHeaderLine,
// sidebarItemSeparators). Projection must surface them on the query result so
// the runtime (lib/designTokens.ts → resolveSidebarDesignSettings) sees them.
//
// Evaluation pattern matches queries.test.ts — groq-js against an in-memory
// fixture dataset.

const BASE_DESIGN_SETTINGS = {
  _id: 'designSettings',
  _type: 'designSettings',
  _rev: '1',
  uiRadius: 'rounded',
  buttonShape: 'rounded',
  buttonAnimation: 'none',
  tertiaryStyle: 'plain',
  taglineStyle: 'plain',
  elevationStyle: '0',
  motionTempo: 'relaxed',
  marketingScale: 'sm',
  fontPairingPreset: '1',
  colorApproach: 'analogous-accent',
  primaryColor: '#821428',
  actionColor: '#E68F1A',
  accent1Color: '#E68F1A',
  accent2Color: '#F5A623',
  internalHeroBackground: 'dark',
}

async function fetch(dataset: Record<string, unknown>[]) {
  const tree = parse(DESIGN_TOKENS_QUERY)
  const result = await evaluate(tree, {dataset})
  return result.get()
}

describe('DESIGN_TOKENS_QUERY — sidebar fields (WS-Sidebar Phase 2.1)', () => {
  it('projects sidebarNavIconStyle when set', async () => {
    const out = await fetch([
      {...BASE_DESIGN_SETTINGS, sidebarNavIconStyle: 'arrows'},
    ])
    expect(out).toMatchObject({sidebarNavIconStyle: 'arrows'})
  })

  it('projects sidebarWidgetHeaderLine when set true', async () => {
    const out = await fetch([
      {...BASE_DESIGN_SETTINGS, sidebarWidgetHeaderLine: true},
    ])
    expect(out).toMatchObject({sidebarWidgetHeaderLine: true})
  })

  it('projects sidebarWidgetHeaderLine when set false (explicit off)', async () => {
    const out = await fetch([
      {...BASE_DESIGN_SETTINGS, sidebarWidgetHeaderLine: false},
    ])
    expect(out).toMatchObject({sidebarWidgetHeaderLine: false})
  })

  it('projects sidebarItemSeparators when set true', async () => {
    const out = await fetch([
      {...BASE_DESIGN_SETTINGS, sidebarItemSeparators: true},
    ])
    expect(out).toMatchObject({sidebarItemSeparators: true})
  })

  it('projects sidebarItemSeparators when set false (explicit off)', async () => {
    const out = await fetch([
      {...BASE_DESIGN_SETTINGS, sidebarItemSeparators: false},
    ])
    expect(out).toMatchObject({sidebarItemSeparators: false})
  })

  it('projects all three sidebar fields together with realistic values', async () => {
    const out = await fetch([
      {
        ...BASE_DESIGN_SETTINGS,
        sidebarNavIconStyle: 'chevrons',
        sidebarWidgetHeaderLine: true,
        sidebarItemSeparators: false,
      },
    ])
    expect(out).toMatchObject({
      sidebarNavIconStyle: 'chevrons',
      sidebarWidgetHeaderLine: true,
      sidebarItemSeparators: false,
    })
  })

  it('returns null for sidebar fields when unset on the document (resolver applies defaults at runtime)', async () => {
    const out = (await fetch([BASE_DESIGN_SETTINGS])) as Record<string, unknown>
    // GROQ projects unset fields as null. The resolver in
    // resolveSidebarDesignSettings handles the defaulting.
    expect(out.sidebarNavIconStyle).toBeNull()
    expect(out.sidebarWidgetHeaderLine).toBeNull()
    expect(out.sidebarItemSeparators).toBeNull()
  })

  it('preserves the other design-token fields alongside the new sidebar fields', async () => {
    const out = await fetch([
      {
        ...BASE_DESIGN_SETTINGS,
        sidebarNavIconStyle: 'arrows',
        sidebarWidgetHeaderLine: true,
        sidebarItemSeparators: true,
      },
    ])
    expect(out).toMatchObject({
      uiRadius: 'rounded',
      buttonShape: 'rounded',
      motionTempo: 'relaxed',
      internalHeroBackground: 'dark',
      // New fields land alongside the pre-existing ones.
      sidebarNavIconStyle: 'arrows',
      sidebarWidgetHeaderLine: true,
      sidebarItemSeparators: true,
    })
  })
})

// Internal-hero site-level defaults — siteHeroBackgroundImage (+ fit) and
// heroScrimOpacity feed the cascade resolver (lib/heroSurface.ts). Projection
// must surface scalars directly and deref the image asset to {src, alt, fit, dims}.
describe('DESIGN_TOKENS_QUERY — internal-hero site defaults', () => {
  it('projects heroScrimOpacity when set (including 0, an explicit value)', async () => {
    expect(await fetch([{...BASE_DESIGN_SETTINGS, heroScrimOpacity: 65}])).toMatchObject({
      heroScrimOpacity: 65,
    })
    expect(await fetch([{...BASE_DESIGN_SETTINGS, heroScrimOpacity: 0}])).toMatchObject({
      heroScrimOpacity: 0,
    })
  })

  it('returns null for heroScrimOpacity + site hero images when unset (resolver defaults)', async () => {
    const out = (await fetch([BASE_DESIGN_SETTINGS])) as Record<string, unknown>
    expect(out.heroScrimOpacity).toBeNull()
    expect(out.siteHeroBackgroundImage).toBeNull()
    expect(out.siteHeroForegroundImage).toBeNull()
  })

  it('derefs siteHeroForegroundImage to {src, alt, width, height} (no fit)', async () => {
    const out = (await fetch([
      {
        ...BASE_DESIGN_SETTINGS,
        siteHeroForegroundImage: {
          _type: 'image',
          alt: 'Managing partner',
          asset: {_type: 'reference', _ref: 'image-fg-1'},
        },
      },
      {
        _id: 'image-fg-1',
        _type: 'sanity.imageAsset',
        url: 'https://cdn.example/partner.png',
        metadata: {dimensions: {width: 900, height: 1300}},
      },
    ])) as Record<string, unknown>
    expect(out.siteHeroForegroundImage).toEqual({
      src: 'https://cdn.example/partner.png',
      alt: 'Managing partner',
      hotspot: null, // no hotspot set on the fixture → projected null
      width: 900,
      height: 1300,
    })
  })

  it('derefs siteHeroBackgroundImage to {src, alt, fit, width, height}', async () => {
    const out = (await fetch([
      {
        ...BASE_DESIGN_SETTINGS,
        siteHeroBackgroundImage: {
          _type: 'image',
          alt: 'Courthouse façade',
          fit: 'tile',
          asset: {_type: 'reference', _ref: 'image-hero-1'},
        },
      },
      {
        _id: 'image-hero-1',
        _type: 'sanity.imageAsset',
        url: 'https://cdn.example/hero.jpg',
        metadata: {dimensions: {width: 1920, height: 1080}},
      },
    ])) as Record<string, unknown>
    expect(out.siteHeroBackgroundImage).toEqual({
      src: 'https://cdn.example/hero.jpg',
      alt: 'Courthouse façade',
      fit: 'tile',
      width: 1920,
      height: 1080,
    })
  })
})
