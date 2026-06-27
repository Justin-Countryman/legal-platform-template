import {describe, it, expect} from 'vitest'
import {
  resolveHeroSurface,
  heroSurfaceBgClass,
  resolveMergedHeaderScheme,
  DEFAULT_SCRIM_OPACITY,
  type HeroSiteDefaults,
  type HeroImage,
} from '../heroSurface'

const SITE_IMG: HeroImage = {src: '/site.jpg', alt: 'Site', fit: 'cover'}
const PAGE_IMG: HeroImage = {src: '/page.jpg', alt: 'Page', fit: 'tile'}
const SITE_FG: HeroImage = {src: '/site-fg.png', alt: 'Site FG'}
const PAGE_FG: HeroImage = {src: '/page-fg.png', alt: 'Page FG'}

const siteDark: HeroSiteDefaults = {scheme: 'dark', bgImage: null, foreground: null, scrimOpacity: 80}
const siteLight: HeroSiteDefaults = {scheme: 'light', bgImage: null, foreground: null, scrimOpacity: 80}
const siteLightWithImg: HeroSiteDefaults = {scheme: 'light', bgImage: SITE_IMG, foreground: null, scrimOpacity: 70}
const siteWithForeground: HeroSiteDefaults = {scheme: 'light', bgImage: null, foreground: SITE_FG, scrimOpacity: 80}

describe('resolveHeroSurface — scheme precedence (page > site > default)', () => {
  it('site dark, no overrides → dark', () => {
    expect(resolveHeroSurface(siteDark).scheme).toBe('dark')
  })

  it('site light, no overrides → light', () => {
    const r = resolveHeroSurface(siteLight)
    expect(r.scheme).toBe('light')
    expect(r.isDark).toBe(false)
  })

  it('page schemeOverride wins over site (light page over dark site)', () => {
    expect(resolveHeroSurface(siteDark, {schemeOverride: 'light'}).scheme).toBe('light')
  })

  it('page schemeOverride wins over site (dark page over light site)', () => {
    expect(resolveHeroSurface(siteLight, {schemeOverride: 'dark'}).scheme).toBe('dark')
  })

  it('schemeOverride "inherit" falls back to the site scheme', () => {
    expect(resolveHeroSurface(siteLight, {schemeOverride: 'inherit'}).scheme).toBe('light')
  })

  it('an image always forces dark, overriding a light page scheme (image⇒dark rule)', () => {
    const r = resolveHeroSurface(siteLight, {
      schemeOverride: 'light',
      backgroundImage: PAGE_IMG,
    })
    expect(r.scheme).toBe('dark')
    expect(r.isDark).toBe(true)
    expect(r.hasImage).toBe(true)
  })
})

describe('resolveHeroSurface — background image cascade (upload > none > site)', () => {
  it('inherit (default) uses the site image + its fit', () => {
    const r = resolveHeroSurface(siteLightWithImg)
    expect(r.hasImage).toBe(true)
    expect(r.bgImage?.src).toBe('/site.jpg')
    expect(r.fit).toBe('cover')
  })

  it('a page upload overrides automatically (no mode flip) and uses its fit', () => {
    const r = resolveHeroSurface(siteLightWithImg, {backgroundImage: PAGE_IMG})
    expect(r.bgImage?.src).toBe('/page.jpg')
    expect(r.fit).toBe('tile')
  })

  it('backgroundNone force-blanks even when the site has an image', () => {
    const r = resolveHeroSurface(siteLightWithImg, {backgroundNone: true})
    expect(r.hasImage).toBe(false)
    expect(r.bgImage).toBeNull()
    // no image → site light scheme applies (not forced dark)
    expect(r.scheme).toBe('light')
  })

  it('a page upload wins over backgroundNone (uploading overrides automatically)', () => {
    const r = resolveHeroSurface(siteLightWithImg, {backgroundImage: PAGE_IMG, backgroundNone: true})
    expect(r.bgImage?.src).toBe('/page.jpg')
    expect(r.hasImage).toBe(true)
  })

  it('no page image + no none + no site image → none', () => {
    expect(resolveHeroSurface(siteLight).hasImage).toBe(false)
  })

  it('fit defaults to cover when unspecified', () => {
    const r = resolveHeroSurface({...siteDark, bgImage: {src: '/x.jpg'}})
    expect(r.fit).toBe('cover')
  })
})

describe('resolveHeroSurface — foreground image cascade (upload > none > site)', () => {
  it('inherit (default) uses the site foreground', () => {
    const r = resolveHeroSurface(siteWithForeground)
    expect(r.hasForeground).toBe(true)
    expect(r.foreground?.src).toBe('/site-fg.png')
  })

  it('a page foreground upload overrides the site foreground', () => {
    const r = resolveHeroSurface(siteWithForeground, {foregroundImage: PAGE_FG})
    expect(r.foreground?.src).toBe('/page-fg.png')
  })

  it('foregroundNone force-blanks even when the site has one', () => {
    const r = resolveHeroSurface(siteWithForeground, {foregroundNone: true})
    expect(r.hasForeground).toBe(false)
    expect(r.foreground).toBeNull()
  })

  it('a page foreground upload wins over foregroundNone', () => {
    const r = resolveHeroSurface(siteWithForeground, {foregroundImage: PAGE_FG, foregroundNone: true})
    expect(r.foreground?.src).toBe('/page-fg.png')
  })

  it('foreground is independent of the background cascade', () => {
    // Background blanked, foreground inherited from site — they do not interfere.
    const site: HeroSiteDefaults = {scheme: 'light', bgImage: SITE_IMG, foreground: SITE_FG, scrimOpacity: 80}
    const r = resolveHeroSurface(site, {backgroundNone: true})
    expect(r.hasImage).toBe(false)
    expect(r.hasForeground).toBe(true)
    expect(r.foreground?.src).toBe('/site-fg.png')
  })

  it('no page foreground + no none + no site foreground → none', () => {
    expect(resolveHeroSurface(siteLight).hasForeground).toBe(false)
  })
})

describe('resolveHeroSurface — scrim opacity (page > site > 80) + clamp', () => {
  it('defaults to 80 when neither set', () => {
    expect(resolveHeroSurface({scheme: 'dark', bgImage: null, foreground: null, scrimOpacity: undefined as unknown as number}).scrimOpacity).toBe(DEFAULT_SCRIM_OPACITY)
  })

  it('uses the site scrim when no page override', () => {
    expect(resolveHeroSurface(siteLightWithImg).scrimOpacity).toBe(70)
  })

  it('page scrimOpacityOverride wins (including 0)', () => {
    expect(resolveHeroSurface(siteLightWithImg, {scrimOpacityOverride: 30}).scrimOpacity).toBe(30)
    expect(resolveHeroSurface(siteLightWithImg, {scrimOpacityOverride: 0}).scrimOpacity).toBe(0)
  })

  it('per-page scrim beats the site default (same precedence as the images)', () => {
    // siteLightWithImg has scrimOpacity 70; a page value of 25 must win.
    const r = resolveHeroSurface(siteLightWithImg, {scrimOpacityOverride: 25})
    expect(r.scrimOpacity).toBe(25)
    expect(r.scrimOpacity).not.toBe(siteLightWithImg.scrimOpacity)
  })

  it('clamps out-of-range values to 0..100', () => {
    expect(resolveHeroSurface(siteDark, {scrimOpacityOverride: 150}).scrimOpacity).toBe(100)
    expect(resolveHeroSurface(siteDark, {scrimOpacityOverride: -20}).scrimOpacity).toBe(0)
  })
})

describe('resolveMergedHeaderScheme — merged-header contrast guardrail', () => {
  it('heroMerge off → leaves the scheme untouched (even a transparent one)', () => {
    expect(resolveMergedHeaderScheme('transparent-dark', false, false)).toBe('transparent-dark')
    expect(resolveMergedHeaderScheme('transparent-light', false, true)).toBe('transparent-light')
  })

  it('merged + transparent header over a LIGHT hero → dark text (transparent-light)', () => {
    expect(resolveMergedHeaderScheme('transparent-dark', true, false)).toBe('transparent-light')
    expect(resolveMergedHeaderScheme('transparent-light', true, false)).toBe('transparent-light')
  })

  it('merged + transparent header over a DARK hero (or any image) → white text (transparent-dark)', () => {
    expect(resolveMergedHeaderScheme('transparent-light', true, true)).toBe('transparent-dark')
    expect(resolveMergedHeaderScheme('transparent-dark', true, true)).toBe('transparent-dark')
  })

  it('image⇒dark: a light site scheme WITH a site hero image yields a dark (white-text) header', () => {
    const surface = resolveHeroSurface({scheme: 'light', bgImage: SITE_IMG, foreground: null, scrimOpacity: 80})
    expect(surface.isDark).toBe(true)
    expect(resolveMergedHeaderScheme('transparent-light', true, surface.isDark)).toBe('transparent-dark')
  })

  it('solid header schemes are left untouched even when merged (no overlay contrast dependency)', () => {
    expect(resolveMergedHeaderScheme('light', true, true)).toBe('light')
    expect(resolveMergedHeaderScheme('dark', true, false)).toBe('dark')
    expect(resolveMergedHeaderScheme('glass', true, false)).toBe('glass')
  })

  it('null/undefined default scheme falls back to "light" (not transparent → untouched)', () => {
    expect(resolveMergedHeaderScheme(null, true, true)).toBe('light')
    expect(resolveMergedHeaderScheme(undefined, true, false)).toBe('light')
  })
})

describe('heroSurfaceBgClass — light-tint fix', () => {
  it('light, no image → bg-hero-tint (NOT bg-background, NOT bg-muted)', () => {
    const cls = heroSurfaceBgClass(resolveHeroSurface(siteLight))
    expect(cls).toBe('bg-hero-tint')
  })

  it('dark, no image → bg-brand-dark', () => {
    expect(heroSurfaceBgClass(resolveHeroSurface(siteDark))).toBe('bg-brand-dark')
  })

  it('with image → no wrapper bg class (backdrop provides the surface)', () => {
    const cls = heroSurfaceBgClass(resolveHeroSurface(siteLightWithImg))
    expect(cls).toBe('')
  })
})

describe('resolveHeroSurface — scrim style (page > site > flat)', () => {
  it('defaults to flat when neither site nor page set it', () => {
    expect(resolveHeroSurface(siteDark).scrimStyle).toBe('flat')
  })

  it('inherits the site scrim style', () => {
    expect(resolveHeroSurface({...siteDark, scrimStyle: 'gradient'}).scrimStyle).toBe('gradient')
  })

  it('page override wins over the site default', () => {
    expect(resolveHeroSurface({...siteDark, scrimStyle: 'gradient'}, {scrimStyleOverride: 'flat'}).scrimStyle).toBe('flat')
    expect(resolveHeroSurface(siteDark, {scrimStyleOverride: 'gradient'}).scrimStyle).toBe('gradient')
  })

  it("page 'inherit' falls through to the site default", () => {
    expect(resolveHeroSurface({...siteDark, scrimStyle: 'gradient'}, {scrimStyleOverride: 'inherit'}).scrimStyle).toBe('gradient')
  })
})

describe('resolveHeroSurface — section background cascade (upload > none > site)', () => {
  const SITE_SECTION: HeroImage = {src: '/site-pattern.png', alt: 'Pattern', fit: 'tile'}
  const PAGE_SECTION: HeroImage = {src: '/page-pattern.png', alt: 'Page pattern', fit: 'cover'}
  const siteWithSection: HeroSiteDefaults = {scheme: 'dark', bgImage: null, foreground: null, scrimOpacity: 80, sectionBg: SITE_SECTION}

  it('inherits the site section background', () => {
    const r = resolveHeroSurface(siteWithSection)
    expect(r.hasSectionBg).toBe(true)
    expect(r.sectionBg?.src).toBe('/site-pattern.png')
    expect(r.sectionBgFit).toBe('tile')
  })

  it('page upload overrides the site section background', () => {
    const r = resolveHeroSurface(siteWithSection, {sectionBackgroundImage: PAGE_SECTION})
    expect(r.sectionBg?.src).toBe('/page-pattern.png')
    expect(r.sectionBgFit).toBe('cover')
  })

  it('page "none" force-blanks even when the site has one', () => {
    const r = resolveHeroSurface(siteWithSection, {sectionBackgroundNone: true})
    expect(r.hasSectionBg).toBe(false)
    expect(r.sectionBg).toBeNull()
  })

  it('a page upload beats the none flag', () => {
    const r = resolveHeroSurface(siteWithSection, {sectionBackgroundImage: PAGE_SECTION, sectionBackgroundNone: true})
    expect(r.sectionBg?.src).toBe('/page-pattern.png')
  })

  it('no site + no page → no section background', () => {
    expect(resolveHeroSurface(siteDark).hasSectionBg).toBe(false)
  })
})
