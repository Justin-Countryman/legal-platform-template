'use client'

// Fallback header band rendered when an internal page has no hero data set.
// Guarantees an h1 in the SSR HTML across routes that previously rendered
// <InternalHero> conditionally.
//
// Routed through the SAME cascade resolver + shared HeroBackdrop as InternalHero
// (lib/heroSurface.ts) with NO page overrides — so it resolves to the pure site
// defaults and never diverges from a configured hero: same scheme, same site
// background image, same scrim. Light scheme paints the neutral `bg-hero-tint`
// surface (NOT bg-background #fff, NOT the accent-tinted bg-muted — no-bg-muted
// lock). Mirrors InternalHero's top padding so spacing under the sticky header
// stays consistent whether or not a hero is configured.
//
// h1 styling uses the `marketing-h1` @utility — clamps from a locked mobile
// floor up to the design-settings-driven `--marketing-h1` ceiling.

import {useHeroScheme} from '@/lib/heroSchemeContext'
import {useHeroSurfaceDefaults} from '@/lib/heroSurfaceContext'
import {resolveHeroSurface, heroSurfaceBgClass} from '@/lib/heroSurface'
import {HeroBackdrop} from '@/components/layout/HeroBackdrop'
import {HeroForeground} from '@/components/layout/HeroForeground'
import {HERO_BAND_MIN_H_LG, HERO_BAND_BASE_MIN_H_LG, HERO_HEADER_CLEARANCE, heroForegroundVars} from '@/lib/heroLayout'

type Props = {title: string}

export function InternalPageHeader({title}: Props) {
  const siteScheme = useHeroScheme()
  const {bgImage: siteBgImage, foreground: siteForeground, scrimOpacity: siteScrim, scrimStyle: siteScrimStyle, sectionBg: siteSectionBg} = useHeroSurfaceDefaults()

  // No page overrides — resolve to pure site defaults (shared surface: site bg
  // image + foreground appear here too, so defaults show site-wide).
  const surface = resolveHeroSurface({
    scheme: siteScheme,
    bgImage: siteBgImage,
    foreground: siteForeground,
    scrimOpacity: siteScrim,
    scrimStyle: siteScrimStyle,
    sectionBg: siteSectionBg,
  })
  const {isDark, hasImage} = surface
  const showSection = !hasImage && surface.hasSectionBg
  const imageBacked = hasImage || (showSection && isDark)

  return (
    <header
      style={{paddingTop: HERO_HEADER_CLEARANCE}}
      data-ring-context={isDark ? 'dark' : undefined}
      data-hero-image={imageBacked ? 'true' : undefined}
      className={[
        // overflow-hidden lets a site-default foreground subject bleed off the
        // bottom; min-height (lg+) gives a standing figure room (head not clipped).
        'relative overflow-hidden px-[5%] pb-12 md:pb-16 lg:pb-20',
        '[--hero-pt:2rem] md:[--hero-pt:3rem] lg:[--hero-pt:4rem]',
        // flex-col lets the content container fill the band (figure stays anchored
        // to the band top regardless of the centered title).
        'flex flex-col',
        surface.hasForeground ? HERO_BAND_MIN_H_LG : HERO_BAND_BASE_MIN_H_LG,
        heroSurfaceBgClass(surface),
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Fallback band is always title-only → center the title WITHIN the filled
          container so the figure stays anchored to the band top. */}
      <div
        className="container relative z-10 flex grow flex-col items-start justify-center"
        style={surface.hasForeground ? heroForegroundVars() : undefined}
      >
        <div
          className="w-full max-w-2xl"
          data-hero-heading-reserve={surface.hasForeground ? '' : undefined}
        >
          <h1 className="marketing-h1 font-bold text-foreground">
            {title}
          </h1>
        </div>

        {/* Site-default foreground column — shared with InternalHero (z-10) */}
        <HeroForeground surface={surface} />
      </div>

      {/* Site-default full-bleed background — focal image when present, else the
          Section Background. Configurable flat/gradient scrim, z-0 below content. */}
      {hasImage ? (
        <HeroBackdrop surface={surface} scrimStyle={surface.scrimStyle} />
      ) : showSection ? (
        <HeroBackdrop
          surface={{...surface, bgImage: surface.sectionBg, hasImage: true, fit: surface.sectionBgFit}}
          scrimStyle={surface.scrimStyle}
        />
      ) : null}
    </header>
  )
}
