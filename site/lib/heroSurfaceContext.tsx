'use client'

// Site-level hero background defaults (image + scrim) supplied once by the
// layout and consumed by InternalHero / InternalPageHeader deep in the page
// tree. The scheme axis travels separately via heroSchemeContext (which already
// supports per-route overrides); this carries only the new image/scrim defaults.

import {createContext, useContext} from 'react'
import {DEFAULT_SCRIM_OPACITY, type HeroImage, type HeroScrimStyle, type HeroScrimColor, type HeroScrimDirection} from './heroSurface'

// Minimal CTA button shape for the site-wide default internal-hero buttons.
// Declared here (not imported from InternalHero) to avoid a lib→component cycle;
// structurally compatible with InternalHero's CtaButtonData.
export type HeroDefaultButton = {title: string; url?: string | null; variant?: 'primary' | 'secondary' | 'link' | null}

export type HeroSurfaceDefaults = {
  bgImage: HeroImage
  foreground: HeroImage
  scrimOpacity: number
  // Site-level scrim style + section background (full-bleed pattern behind heroes
  // with no focal bg image), sourced from Hero Settings.
  scrimStyle: HeroScrimStyle
  // Site-level gradient color + direction (gradient style only).
  scrimColor: HeroScrimColor
  scrimDirection: HeroScrimDirection
  sectionBg: HeroImage
  // Site-wide default internal-hero CTA buttons (Hero Settings). A page overrides
  // with its own buttons or suppresses them (buttonsNone); cascade in InternalHero.
  defaultButtons: HeroDefaultButton[]
}

const DEFAULT: HeroSurfaceDefaults = {
  bgImage: null,
  foreground: null,
  scrimOpacity: DEFAULT_SCRIM_OPACITY,
  scrimStyle: 'flat',
  scrimColor: 'auto',
  scrimDirection: 'auto',
  sectionBg: null,
  defaultButtons: [],
}

const HeroSurfaceContext = createContext<HeroSurfaceDefaults>(DEFAULT)

export const useHeroSurfaceDefaults = () => useContext(HeroSurfaceContext)

export function HeroSurfaceProvider({
  value,
  children,
}: {
  value: HeroSurfaceDefaults
  children: React.ReactNode
}) {
  return <HeroSurfaceContext.Provider value={value}>{children}</HeroSurfaceContext.Provider>
}
