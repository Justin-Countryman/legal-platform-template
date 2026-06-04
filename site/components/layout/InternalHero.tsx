'use client'

import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {useHeroScheme} from '@/lib/heroSchemeContext'
import {useHeroSurfaceDefaults} from '@/lib/heroSurfaceContext'
import {
  resolveHeroSurface,
  heroSurfaceBgClass,
  type HeroImage,
  type HeroSchemePref,
} from '@/lib/heroSurface'
import {HeroBackdrop} from '@/components/layout/HeroBackdrop'
import {HeroForeground} from '@/components/layout/HeroForeground'
import {HERO_BAND_MIN_H_LG, HERO_BAND_BASE_MIN_H_LG, heroForegroundVars} from '@/lib/heroLayout'
import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CtaButtonData = {
  title: string
  url?: string | null
  variant?: 'primary' | 'secondary' | 'link' | null
}

export type InternalHeroData = {
  heading: string
  description?: string | null
  buttons?: CtaButtonData[] | null
  // Cascade overrides (see lib/heroSurface.ts) — each image: upload to override,
  // *None to force-blank, otherwise inherit the site default.
  schemeOverride?: HeroSchemePref | null
  backgroundImage?: HeroImage
  backgroundNone?: boolean | null
  foregroundImage?: HeroImage
  foregroundNone?: boolean | null
  scrimOpacityOverride?: number | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InternalHero({data, napTokens}: {data: InternalHeroData; napTokens?: NapTokens | null}) {
  const siteScheme = useHeroScheme()
  const {bgImage: siteBgImage, foreground: siteForeground, scrimOpacity: siteScrim} = useHeroSurfaceDefaults()

  const resolved = napTokens
    ? {
        ...data,
        heading: resolveTokenString(data.heading, napTokens) || data.heading,
        description: resolveTokenString(data.description, napTokens) || data.description,
        buttons: data.buttons?.map((btn) => ({
          ...btn,
          title: resolveTokenString(btn.title, napTokens) || btn.title,
        })),
      }
    : data
  const {heading, description, buttons} = resolved

  // Effective surface: page overrides > site defaults > none.
  const surface = resolveHeroSurface(
    {scheme: siteScheme, bgImage: siteBgImage, foreground: siteForeground, scrimOpacity: siteScrim},
    {
      schemeOverride: data.schemeOverride,
      backgroundImage: data.backgroundImage,
      backgroundNone: data.backgroundNone,
      foregroundImage: data.foregroundImage,
      foregroundNone: data.foregroundNone,
      scrimOpacityOverride: data.scrimOpacityOverride,
    },
  )
  const {isDark, hasImage} = surface
  const hasButtons = buttons && buttons.length > 0
  // A bare h1 (no description, no buttons) is vertically centered in a min-height
  // band; once there's a description or buttons the content stacks from the top.
  const onlyHeading = !description && !hasButtons

  return (
    <section
      style={{paddingTop: 'calc(var(--header-height, 8rem) + var(--hero-pt, 4rem))'}}
      data-ring-context={isDark ? 'dark' : undefined}
      data-hero-image={hasImage ? 'true' : undefined}
      className={[
        // overflow-hidden lets the foreground subject bleed off the bottom edge;
        // min-height (lg+) gives a standing figure room so its head isn't clipped.
        'relative overflow-hidden px-[5%] pb-12 md:pb-16 lg:pb-20',
        '[--hero-pt:2rem] md:[--hero-pt:3rem] lg:[--hero-pt:4rem]',
        // flex-col lets the content container fill the band height (so the
        // foreground figure, anchored to the container top, stays at the band top
        // regardless of how the heading is aligned within it).
        'flex flex-col',
        // Band height: foreground figure → tall band; bare h1 → modest banner so
        // there is room to center; otherwise content-driven (unchanged).
        surface.hasForeground ? HERO_BAND_MIN_H_LG : onlyHeading && HERO_BAND_BASE_MIN_H_LG,
        heroSurfaceBgClass(surface),
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Content — fills the band (grow) so the figure anchors to the band top;
          a bare h1 is centered WITHIN the container (justify-center) while the
          figure stays put. Two-column at lg+ via data-hero-heading-reserve. */}
      <div
        className={[
          'container relative z-10 flex grow flex-col items-start',
          onlyHeading && 'justify-center',
        ]
          .filter(Boolean)
          .join(' ')}
        style={surface.hasForeground ? heroForegroundVars() : undefined}
      >
        <div
          className="w-full max-w-2xl"
          data-hero-heading-reserve={surface.hasForeground ? '' : undefined}
        >

          <h1 className={`text-page-h1 font-bold text-foreground${onlyHeading ? '' : ' mb-5 md:mb-6'}`}>
            {heading}
          </h1>

          {description && (
            <p className="md:text-md text-foreground">
              {description}
            </p>
          )}

          {hasButtons && (
            <ButtonGroup
              items={toCtaItems(buttons)}
              context={isDark ? 'dark' : 'light'}
              className="mt-6 md:mt-8"
            />
          )}

        </div>

        {/* Foreground column — shared with InternalPageHeader (z-10 above scrim) */}
        <HeroForeground surface={surface} />
      </div>

      {/* Background image + configurable scrim — z-0 below content */}
      <HeroBackdrop surface={surface} />
    </section>
  )
}
