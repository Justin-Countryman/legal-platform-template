// Internal-hero cascade resolver — the single source of truth for a hero's
// effective {scheme, background image + fit, foreground image, scrim opacity}.
//
// Precedence everywhere: page override > site default > none.
// Both images cascade identically (resolveImageCascade): a per-page upload
// overrides automatically (no manual "mode" flip — that flip was the family-law
// override bug), an explicit per-page "none" force-blanks even when the site has
// an image, and otherwise the page inherits the site default.
//
// Used by InternalHero AND InternalPageHeader (the no-hero fallback band) so the
// two never diverge — InternalPageHeader passes no page overrides, resolving to
// the pure site defaults (so site bg + foreground show site-wide).

export type HeroScheme = 'dark' | 'light'
export type HeroSchemePref = 'inherit' | 'dark' | 'light'
export type HeroFit = 'cover' | 'tile'
export type HeroScrimStyle = 'flat' | 'gradient'
// Per-page scrim-style override: 'inherit' falls back to the site default.
export type HeroScrimStylePref = 'inherit' | 'flat' | 'gradient'

export type HeroImage = {
  src: string
  alt?: string | null
  width?: number | null
  height?: number | null
  fit?: HeroFit | null
  // Sanity hotspot focal point (0–1). Used as object-position when the foreground
  // card crops the photo to its aspect, so faces aren't cut.
  hotspot?: {x: number; y: number} | null
} | null

// CSS object-position string from a Sanity hotspot (0–1 → percentage), so an
// object-cover crop keeps the focal point (e.g. a face) in frame instead of
// always centering. Returns undefined when there's no hotspot (→ default center).
export function heroObjectPosition(img: HeroImage): string | undefined {
  const h = img?.hotspot
  if (!h || typeof h.x !== 'number' || typeof h.y !== 'number') return undefined
  return `${(h.x * 100).toFixed(2)}% ${(h.y * 100).toFixed(2)}%`
}

// Site-level defaults — designSettings (internalHeroBackground +
// siteHeroBackgroundImage + siteHeroForegroundImage + heroScrimOpacity),
// reaching the components via context (scheme through heroSchemeContext,
// images/scrim through heroSurfaceContext).
export type HeroSiteDefaults = {
  scheme: HeroScheme
  bgImage: HeroImage
  foreground: HeroImage
  scrimOpacity: number
  // Site-level scrim style + section background (full-bleed pattern behind heroes
  // with no focal bg image). Optional so existing callers stay valid (default flat / none).
  scrimStyle?: HeroScrimStyle | null
  sectionBg?: HeroImage
}

// Per-page overrides — the page's internalHero object fields. Each image cascades
// the same way: an uploaded image overrides; a `*None` flag force-blanks;
// otherwise the page inherits the site default.
export type HeroPageOverrides = {
  schemeOverride?: HeroSchemePref | null
  backgroundImage?: HeroImage
  backgroundNone?: boolean | null
  foregroundImage?: HeroImage
  foregroundNone?: boolean | null
  scrimOpacityOverride?: number | null
  scrimStyleOverride?: HeroScrimStylePref | null
  sectionBackgroundImage?: HeroImage
  sectionBackgroundNone?: boolean | null
} | null | undefined

export type ResolvedHeroSurface = {
  scheme: HeroScheme
  isDark: boolean
  bgImage: HeroImage
  hasImage: boolean
  fit: HeroFit
  foreground: HeroImage
  hasForeground: boolean
  scrimOpacity: number
  // Scrim style (flat | gradient) for whichever full-bleed background is active.
  scrimStyle: HeroScrimStyle
  // Section background — the full-bleed pattern/texture shown behind heroes that
  // have NO focal bg image. Independent of bgImage.
  sectionBg: HeroImage
  hasSectionBg: boolean
  sectionBgFit: HeroFit
}

export const DEFAULT_SCRIM_OPACITY = 80

const clampScrim = (n: number): number => Math.max(0, Math.min(100, n))

// One cascade for both images: page upload (custom) > page none > site > none.
// An uploaded page image wins automatically — no separate mode flip. The `none`
// flag only matters when the page has not uploaded its own image.
function resolveImageCascade(
  pageImage: HeroImage | undefined,
  pageNone: boolean | null | undefined,
  siteImage: HeroImage,
): HeroImage {
  if (pageImage?.src) return pageImage
  if (pageNone) return null
  return siteImage?.src ? siteImage : null
}

export function resolveHeroSurface(
  site: HeroSiteDefaults,
  page?: HeroPageOverrides,
): ResolvedHeroSurface {
  const p = page ?? {}

  // 1. Background + foreground images — identical cascade.
  const bgImage = resolveImageCascade(p.backgroundImage, p.backgroundNone, site.bgImage)
  const hasImage = !!bgImage?.src
  const fit: HeroFit = bgImage?.fit === 'tile' ? 'tile' : 'cover'

  const foreground = resolveImageCascade(p.foregroundImage, p.foregroundNone, site.foreground)
  const hasForeground = !!foreground?.src

  // 2. Scheme — a background image always forces dark (scrim + white text);
  //    otherwise page override wins, then the site default, then 'dark'.
  let scheme: HeroScheme
  if (hasImage) {
    scheme = 'dark'
  } else if (p.schemeOverride === 'dark' || p.schemeOverride === 'light') {
    scheme = p.schemeOverride
  } else {
    scheme = site.scheme === 'light' ? 'light' : 'dark'
  }

  // 3. Scrim opacity — page override > site default > 80.
  const scrimRaw =
    typeof p.scrimOpacityOverride === 'number'
      ? p.scrimOpacityOverride
      : typeof site.scrimOpacity === 'number'
        ? site.scrimOpacity
        : DEFAULT_SCRIM_OPACITY
  const scrimOpacity = clampScrim(scrimRaw)

  // 4. Scrim style — page override (inherit falls through) > site default > flat.
  const scrimStyle: HeroScrimStyle =
    p.scrimStyleOverride === 'flat' || p.scrimStyleOverride === 'gradient'
      ? p.scrimStyleOverride
      : site.scrimStyle === 'flat' || site.scrimStyle === 'gradient'
        ? site.scrimStyle
        : 'flat'

  // 5. Section background — same cascade as the images (page upload > page none >
  //    site). Independent of the focal bg image; rendered only when there's no
  //    focal image (the consumer decides). Fit derived from the resolved image.
  const sectionBg = resolveImageCascade(p.sectionBackgroundImage, p.sectionBackgroundNone, site.sectionBg ?? null)
  const hasSectionBg = !!sectionBg?.src
  const sectionBgFit: HeroFit = sectionBg?.fit === 'tile' ? 'tile' : 'cover'

  const isDark = scheme === 'dark' || hasImage
  return {
    scheme,
    isDark,
    bgImage,
    hasImage,
    fit,
    foreground,
    hasForeground,
    scrimOpacity,
    scrimStyle,
    sectionBg,
    hasSectionBg,
    sectionBgFit,
  }
}

// Wrapper background class for the hero section/header element. With an image
// the image+scrim provide the surface (no bg class). Otherwise: dark → the
// brand-dark surface; light → the neutral hero tint (NOT bg-background #fff,
// NOT the accent-derived bg-muted — see no-bg-muted lock).
export function heroSurfaceBgClass(s: ResolvedHeroSurface): string {
  if (s.hasImage) return ''
  return s.isDark ? 'bg-brand-dark' : 'bg-hero-tint'
}

// Merged-header contrast guardrail.
//
// When heroMerge is on, the at-top header is transparent and overlays the hero,
// so its text/logo polarity must match the hero behind it — otherwise white
// header text can land on a light hero (or vice-versa). Instead of trusting the
// independent mainNavigation default scheme, derive the transparent variant from
// the EFFECTIVE site hero scheme: dark hero (or any hero image ⇒ dark) → white
// text (transparent-dark); light hero → dark text (transparent-light).
//
// Only the transparent at-top state is adjusted: a solid header scheme paints
// its own background and has no contrast dependency on the hero, so it is left
// untouched. heroMerge off → no overlay → unchanged. scrolledScheme is separate
// (the scrolled header is solid) and is not touched here. The --header-height
// top-padding contract is unaffected — this only swaps text/bg polarity.
const TRANSPARENT_SCHEMES = new Set(['transparent-dark', 'transparent-light'])

export function resolveMergedHeaderScheme(
  currentDefaultScheme: string | null | undefined,
  heroMerge: boolean,
  siteHeroIsDark: boolean,
): string {
  const current = currentDefaultScheme ?? 'light'
  if (!heroMerge) return current
  if (!TRANSPARENT_SCHEMES.has(current)) return current
  return siteHeroIsDark ? 'transparent-dark' : 'transparent-light'
}
