'use client'

import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {useHeroScheme} from '@/lib/heroSchemeContext'
import {useHeroSurfaceDefaults} from '@/lib/heroSurfaceContext'
import {
  resolveHeroSurface,
  heroSurfaceBgClass,
  type HeroImage,
  type HeroSchemePref,
  type HeroScrimStylePref,
  type HeroScrimColorPref,
  type HeroScrimDirectionPref,
} from '@/lib/heroSurface'
import {HeroBackdrop} from '@/components/layout/HeroBackdrop'
import {HeroForeground} from '@/components/layout/HeroForeground'
import {HERO_BAND_MIN_H_LG, HERO_BAND_BASE_MIN_H_LG, HERO_HEADER_CLEARANCE, heroForegroundVars} from '@/lib/heroLayout'
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
  // Buttons cascade: page buttons override the site-wide default; buttonsNone
  // suppresses both. (See lib/heroSurfaceContext.ts defaultButtons.)
  buttonsNone?: boolean | null
  // Cascade overrides (see lib/heroSurface.ts) — each image: upload to override,
  // *None to force-blank, otherwise inherit the site default.
  schemeOverride?: HeroSchemePref | null
  backgroundImage?: HeroImage
  backgroundNone?: boolean | null
  foregroundImage?: HeroImage
  foregroundNone?: boolean | null
  scrimOpacityOverride?: number | null
  scrimStyleOverride?: HeroScrimStylePref | null
  scrimColorOverride?: HeroScrimColorPref | null
  scrimDirectionOverride?: HeroScrimDirectionPref | null
  sectionBackgroundImage?: HeroImage
  sectionBackgroundNone?: boolean | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InternalHero({data, napTokens}: {data: InternalHeroData; napTokens?: NapTokens | null}) {
  const siteScheme = useHeroScheme()
  const {bgImage: siteBgImage, foreground: siteForeground, scrimOpacity: siteScrim, scrimStyle: siteScrimStyle, scrimColor: siteScrimColor, scrimDirection: siteScrimDirection, sectionBg: siteSectionBg, defaultButtons: siteDefaultButtons} = useHeroSurfaceDefaults()

  // Buttons cascade — mirrors the image cascade (page > none > site): the page's
  // own buttons win; else an explicit "no buttons" suppresses (→ none) even when a
  // site default is set; else the site-wide default. Empty page buttons + no toggle
  // falls through to the default — a distinct path from explicit-none.
  const pageButtons = data.buttons ?? []
  const rawButtons: CtaButtonData[] = pageButtons.length > 0 ? pageButtons : data.buttonsNone ? [] : siteDefaultButtons

  const resolved = napTokens
    ? {
        ...data,
        heading: resolveTokenString(data.heading, napTokens) || data.heading,
        description: resolveTokenString(data.description, napTokens) || data.description,
        buttons: rawButtons.map((btn) => ({
          ...btn,
          title: resolveTokenString(btn.title, napTokens) || btn.title,
        })),
      }
    : {...data, buttons: rawButtons}
  const {heading, description, buttons} = resolved

  // Effective surface: page overrides > site defaults > none.
  const surface = resolveHeroSurface(
    {scheme: siteScheme, bgImage: siteBgImage, foreground: siteForeground, scrimOpacity: siteScrim, scrimStyle: siteScrimStyle, scrimColor: siteScrimColor, scrimDirection: siteScrimDirection, sectionBg: siteSectionBg},
    {
      schemeOverride: data.schemeOverride,
      backgroundImage: data.backgroundImage,
      backgroundNone: data.backgroundNone,
      foregroundImage: data.foregroundImage,
      foregroundNone: data.foregroundNone,
      scrimOpacityOverride: data.scrimOpacityOverride,
      scrimStyleOverride: data.scrimStyleOverride,
      scrimColorOverride: data.scrimColorOverride,
      scrimDirectionOverride: data.scrimDirectionOverride,
      sectionBackgroundImage: data.sectionBackgroundImage,
      sectionBackgroundNone: data.sectionBackgroundNone,
    },
  )
  const {isDark, hasImage} = surface
  // A Section Background renders only when there's no focal background image (it's
  // the subtle textured ground behind a scheme-colored hero). The focal image, when
  // present, already fills the bleed. Buttons read as image-backed only when dark.
  const showSection = !hasImage && surface.hasSectionBg
  const imageBacked = hasImage || (showSection && isDark)
  const hasButtons = buttons && buttons.length > 0
  // A bare h1 (no description, no buttons) is vertically centered in a min-height
  // band; once there's a description or buttons the content stacks from the top.
  const onlyHeading = !description && !hasButtons

  return (
    <section
      style={{paddingTop: HERO_HEADER_CLEARANCE}}
      data-ring-context={isDark ? 'dark' : undefined}
      data-hero-image={imageBacked ? 'true' : undefined}
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

      {/* Full-bleed background — the focal image when present, else the Section
          Background (textured ground). Configurable flat/gradient scrim, z-0. */}
      {hasImage ? (
        <HeroBackdrop surface={surface} scrimStyle={surface.scrimStyle} scrimColor={surface.scrimColor} scrimDirection={surface.scrimDirection} />
      ) : showSection ? (
        <HeroBackdrop
          surface={{...surface, bgImage: surface.sectionBg, hasImage: true, fit: surface.sectionBgFit}}
          scrimStyle={surface.scrimStyle}
          scrimColor={surface.scrimColor}
          scrimDirection={surface.scrimDirection}
        />
      ) : null}
    </section>
  )
}
